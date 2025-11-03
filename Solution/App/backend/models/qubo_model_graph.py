import math
import numpy as np
import pandas as pd
from geopy.distance import geodesic
import sqlite3
import time
import sys
import dimod
import neal
from collections import defaultdict

DB_PATH = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\database.db"


def get_shelter_allocation(budget: float, allowedDistance: float, averagePersonPerBuilding: int):
    start = time.time()

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("SELECT * FROM shelters WHERE type='existing_shelter'")
        existing_shelters = cur.fetchall()

        cur.execute("SELECT * FROM shelters WHERE type='new_shelter'")
        new_shelters = cur.fetchall()

        cur.execute("SELECT * FROM residential_buildings")
        residential_buildings = cur.fetchall()

        conn.close()
    except sqlite3.OperationalError as e:
        print(f"BŁĄD: Nie można połączyć się z bazą danych lub znaleźć tabel: {e}")
        print(f"Oczekiwana ścieżka: {DB_PATH}")
        return {"status": "error_db_connection", "message": str(e)}

    ids_existing = [row["id"] for row in existing_shelters]
    ids_new = [row["id"] for row in new_shelters]
    ids_res = [row["id"] for row in residential_buildings]

    L_existing = [[row["x"], row["y"]] for row in existing_shelters]
    L_new = [[row["x"], row["y"]] for row in new_shelters]
    L = L_new + L_existing

    s = len(L_new)  # Liczba nowych schronów
    e = len(L_existing)  # Liczba istniejących schronów
    h = len(residential_buildings)  # Liczba budynków mieszkalnych

    p = budget  # Budżet
    K = 100.0  # Kara za nieprzypisanie (używamy float dla QUBO)

    M = [[row["x"], row["y"]] for row in residential_buildings]

    # Macierz odległości
    if len(L) == 0 or len(M) == 0:
        return {"status": "no_data", "message": "brak schronów lub budynków mieszkalnych w bazie"}

    r = np.array([[geodesic(l, m).kilometers for m in M] for l in L])

    # Koszty i pojemności
    c = [float(row["cost"]) for row in new_shelters] + [0.0] * e
    v = [int(row["capacity"] / averagePersonPerBuilding) for row in new_shelters] + \
        [int(row["capacity"] / averagePersonPerBuilding) for row in existing_shelters]

    # Przechowujemy oryginalne pojemności dla formatowania wyjścia
    capacity_original = [row["capacity"] for row in new_shelters] + [row["capacity"] for row in existing_shelters]

    x_vars = {}
    y_vars = [f'y_{i}' for i in range(s)]
    z_vars = [f'z_{n}' for n in range(h)]

    # ograniczenie liczby zmiennych decyzyjnych
    valid_pairs = []
    valid_i_for_n = [[] for _ in range(h)]
    valid_n_for_i = [[] for _ in range(s + e)]

    for i in range(s + e):
        for n in range(h):
            if r[i, n] <= allowedDistance:
                var_name = f'x_{i}_{n}'
                x_vars[(i, n)] = var_name
                valid_pairs.append((i, n))
                valid_i_for_n[n].append(i)
                valid_n_for_i[i].append(n)

    print(f"Info: Zredukowano liczbę zmiennych 'x' z {h * (s + e)} do {len(valid_pairs)} przez filtr odległości.")

    # budowa słownika bqm
    linear = defaultdict(float)
    quadratic = defaultdict(float)
    offset = 0.0

    max_cost = max(c) if s > 0 else 0
    max_dist_cost = np.max(r[r <= allowedDistance]) * h if len(valid_pairs) > 0 else 0

    P_LARGE = (max_cost + K + max_dist_cost) * 10.0 + 1000.0

    print(f"Info: Używam współczynnika kary P_LARGE = {P_LARGE}")


    # Minimalizacja odległości (r_in * x_in)
    for i, n in valid_pairs:
        linear[x_vars[(i, n)]] += float(r[i, n])

    # Minimalizacja kosztu budowy (c_i * y_i)
    for i in range(s):  # Tylko dla nowych schronów
        linear[y_vars[i]] += float(c[i])

    # Kara za nieprzypisane budynki (K * z_n)
    for n in range(h):
        linear[z_vars[n]] += float(K)

    print("Info: Funkcja celu przygotowana.")

    # Stwórz BQM
    bqm = dimod.BinaryQuadraticModel(dict(linear), dict(quadratic), offset, dimod.BINARY)

    # Ograniczenie (1): Każdy budynek 'n' musi być przypisany do 'i' LUB oznaczony jako 'z_n'
    for n in range(h):
        constraint_vars = [x_vars[(i, n)] for i in valid_i_for_n[n]] + [z_vars[n]]
        if not constraint_vars:
            # jeśli dla n nie ma żadnego i w zasięgu to zmienna z_n musi być 1
            linear[z_vars[n]] += P_LARGE
            bqm = dimod.BinaryQuadraticModel(dict(linear), dict(quadratic), offset, dimod.BINARY)
            continue

        bqm.add_linear_equality_constraint(
            terms=[(var, 1) for var in constraint_vars],
            constant=-1,
            lagrange_multiplier=P_LARGE
        )
    print("Info: Ograniczenie (1) [Przypisanie] dodane do BQM.")

    # Ograniczenie (2) i (4): Pojemność i zależność budowy
    for i in range(s + e):
        terms_x = [(x_vars[(i, n)], 1) for n in valid_n_for_i[i]]
        if not terms_x:
            continue

        if i < s:
            all_terms = terms_x + [(y_vars[i], -v[i])]
            bqm.add_linear_inequality_constraint(
                terms=all_terms,
                constant=0,
                ub=0,  # upper bound: <= 0
                lagrange_multiplier=P_LARGE,
                label=f'capacity_new_{i}'
            )
        else:
            bqm.add_linear_inequality_constraint(
                terms=terms_x,
                constant=-v[i],  # sum(...) + constant <= ub
                ub=0,
                lagrange_multiplier=P_LARGE,
                label=f'capacity_existing_{i}'
            )
    print("Info: Ograniczenie (2) i (4) [Pojemność i Zależność] dodane do BQM.")

    # Ograniczenie (3): Budżet
    budget_terms = [(y_vars[i], c[i]) for i in range(s) if c[i] > 0]

    if budget_terms:
        bqm.add_linear_inequality_constraint(
            terms=budget_terms,
            constant=-p,
            ub=0,
            lagrange_multiplier=P_LARGE,
            label='budget'
        )
        print("Info: Ograniczenie (3) [Budżet] dodane do BQM.")
    else:
        print("Info: Brak nowych schronów z kosztem, pomijam ograniczenie budżetowe.")


    print(f"\nInfo: Model BQM zbudowany. Liczba zmiennych: {len(bqm.variables)}")
    print("Info: Rozpoczynam wyżarzanie (NEAL)...")

    sampler = neal.SimulatedAnnealingSampler()
    sampleset = sampler.sample(bqm, num_reads=10, num_sweeps=5000)

    print(f"Info: Wyżarzanie zakończone. Całkowity czas: {time.time() - start:.2f}s")

    # Filtracja wykonalnych rozwiązań (jeśli metadata is_feasible jest dostępna)
    try:
        feasible_sampleset = sampleset.filter(lambda d: d.is_feasible)
    except Exception:
        # w razie gdy filter/metadane nie są dostępne, przyjmijemy wszystkie próbki
        feasible_sampleset = sampleset

    if len(feasible_sampleset) == 0:
        print("BŁĄD: Neal nie znalazł żadnego wykonalnego rozwiązania (spełniającego ograniczenia).")
        print("Możliwe przyczyny: Zbyt małe 'num_reads/num_sweeps', zbyt duży problem, lub sprzeczne ograniczenia.")
        best_sample = sampleset.first.sample
        print(f"Info: Najlepsza znaleziona energia (niewykonalna): {sampleset.first.energy}")
        return {"status": "no_feasible_solution_found_by_neal", "time": int((time.time() - start))}

    best_sample = feasible_sampleset.first.sample
    best_energy = feasible_sampleset.first.energy

    print(f"Info: Znaleziono wykonalne rozwiązanie! Najniższa energia: {best_energy}")
    print("Info: Formatowanie wyjścia zgodnie z wymaganym formatem...")

    # ----------------------------------------------------------------------
    # Formatowanie wyjścia
    # ----------------------------------------------------------------------
    points = []
    total_population = h * averagePersonPerBuilding
    assigned_buildings = 0
    total_distance = 0.0
    built_shelters = 0
    total_built_cost = 0.0
    total_capacity_used = 0
    total_capacity_available = 0

    true_objective = 0.0

    for i, coords in enumerate(L):
        is_built = False
        cost = 0.0

        if i < s:  # Nowy schron
            point_id = ids_new[i]
            is_built = int(best_sample.get(y_vars[i], 0)) == 1
            cost = c[i]

            if is_built:
                schron_type = "built_shelter"
                built_shelters += 1
                total_built_cost += cost
                total_capacity_available += capacity_original[i]
                true_objective += c[i]
            else:
                schron_type = "potential_shelter"
        else:  # Istniejący schron
            point_id = ids_existing[i - s]
            is_built = True
            schron_type = "built_shelter"
            cost = 0.0
            total_capacity_available += capacity_original[i]

        points.append({
            "id": int(point_id),
            "type": schron_type,
            "cost": cost,
            "assigned_to": None,
            "x": coords[0],
            "y": coords[1],
            "capacity": capacity_original[i]
        })

    for n, coords in enumerate(M):
        assigned_to_id = None
        dist_to_shelter = None

        is_unassigned = int(best_sample.get(z_vars[n], 0)) == 1

        if is_unassigned:
            true_objective += K
        else:
            for i in valid_i_for_n[n]:
                var_name = x_vars.get((i, n))
                if var_name and int(best_sample.get(var_name, 0)) == 1:
                    assigned_to_id = ids_new[i] if i < s else ids_existing[i - s]
                    dist_to_shelter = r[i, n]
                    break

        if assigned_to_id:
            assigned_buildings += 1
            total_distance += dist_to_shelter
            total_capacity_used += averagePersonPerBuilding
            true_objective += float(dist_to_shelter)

        points.append({
            "id": int(ids_res[n]),
            "type": "apartment",
            "cost": None,
            "assigned_to": int(assigned_to_id) if assigned_to_id else None,
            "x": coords[0],
            "y": coords[1],
            "capacity": None
        })

    stats = {
        "total_population": total_population,
        "covered_population": assigned_buildings * averagePersonPerBuilding,
        "percent_covered": round((assigned_buildings / h) * 100, 2) if h > 0 else 0,
        "average_distance": round(total_distance / assigned_buildings, 3) if assigned_buildings > 0 else 0,
        "total_built_cost": round(total_built_cost),
        "average_cost_built": round(total_built_cost / built_shelters, 2) if built_shelters > 0 else 0,
        "built_shelters": built_shelters,
        "capacity_fill_percent": round((total_capacity_used / total_capacity_available) * 100, 2) if total_capacity_available > 0 else 0
    }

    total_time_sec = time.time() - start

    return {
        "points": points,
        "objective": float(true_objective),
        "used_budget": total_built_cost,
        "time": int(total_time_sec / 60) if total_time_sec > 60 else int(total_time_sec),
        "stats": stats
    }