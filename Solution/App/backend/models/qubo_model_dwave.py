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
    K = 100.0

    M = [[row["x"], row["y"]] for row in residential_buildings]
    r = np.array([[geodesic(l, m).kilometers for m in M] for l in L])

    # Koszty i pojemności
    c = [float(row["cost"]) for row in new_shelters] + [0.0] * e
    v = [int(row["capacity"] / averagePersonPerBuilding) for row in new_shelters] + \
        [int(row["capacity"] / averagePersonPerBuilding) for row in existing_shelters]

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

    linear = defaultdict(float)
    quadratic = defaultdict(float)
    offset = 0.0

    max_cost = max(c) if s > 0 else 0
    max_dist_cost = np.max(r[r <= allowedDistance]) * h if len(valid_pairs) > 0 else 0

    P_LARGE = (max_cost + K + max_dist_cost) * 10000.0 + 1000.0
    if P_LARGE <= 0:
        P_LARGE = 1e4

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

    # Wymuszenie x_{in} <= y_i jako silna kara: P*(x - x*y) = P*x - P*x*y
    # Dodajemy to tylko dla i < s (nowe schrony mają y). Dla istniejących y=1 (nie ma zmiennej).
    for (i, n) in valid_pairs:
        if i < s:
            xname = x_vars[(i, n)]
            yname = y_vars[i]
            linear[xname] += P_LARGE  # +P*x
            # interakcja -P * x*y  (kwadratowy współczynnik)
            quadratic_key = tuple(sorted((xname, yname)))
            quadratic[quadratic_key] += -P_LARGE

    print("Info: Dodano karę wymuszającą x_in <= y_i.")

    # Tworzymy BQM z linear/quad
    # dimod expects quadratic dict keys as (u,v) where u != v
    bqm = dimod.BinaryQuadraticModel(dict(linear), {k: v for k, v in quadratic.items()}, offset, dimod.BINARY)

    # Ograniczenie (1): Każdy budynek 'n' musi być przypisany do 'i' LUB oznaczony jako 'z_n'
    for n in range(h):
        constraint_vars = [x_vars[(i, n)] for i in valid_i_for_n[n]] + [z_vars[n]]
        if not constraint_vars:
            linear[z_vars[n]] += P_LARGE
            bqm = dimod.BinaryQuadraticModel(dict(linear), {k: v for k, v in quadratic.items()}, offset, dimod.BINARY)
            continue

        # dodajemy karę kwadratową ręcznie: P*(sum(vars) - 1)^2
        # Rozwiń (sum vars -1)^2 = sum_i sum_j var_i var_j - 2 sum_i var_i + 1
        vars_list = constraint_vars
        # pary
        for i1 in range(len(vars_list)):
            v1 = vars_list[i1]
            linear[v1] += P_LARGE * (-2.0)  # -2P * v1 part
            for i2 in range(i1, len(vars_list)):
                v2 = vars_list[i2]
                pair = tuple(sorted((v1, v2)))
                quadratic[pair] += P_LARGE * (1.0)  # P * v1*v2
        offset += P_LARGE * 1.0  # +P*1

    # zaktualizuj bqm po dodaniu constraintów
    bqm = dimod.BinaryQuadraticModel(dict(linear), {k: v for k, v in quadratic.items()}, offset, dimod.BINARY)
    print("Info: Ograniczenie (1) [Przypisanie] dodane do BQM (jawnie).")

    # Ograniczenie (2) i (4): Pojemność i zależność budowy
    for i in range(s + e):
        terms = valid_n_for_i[i]
        if not terms:
            continue

        # sum_n x_in - v_i*y_i
        vars_list = []
        coeffs = []
        for n in terms:
            vars_list.append(x_vars[(i, n)])
            coeffs.append(1.0)
        if i < s:
            vars_list.append(y_vars[i])
            coeffs.append(-float(v[i]))
        else:
            offset += 0.0

        for a in range(len(vars_list)):
            va = vars_list[a]
            ca = coeffs[a]
            linear[va] += P_LARGE * (ca * ca) * 0.0  # placeholder by ensure key exists
            for b in range(a, len(vars_list)):
                vb = vars_list[b]
                cb = coeffs[b]
                pair = tuple(sorted((va, vb)))
                quadratic[pair] += P_LARGE * (ca * cb)

        # dodać stałą term: (-v_i)^2 * P jeśli jest i < s? but constant doesn't affect feasibility
    # zaktualizuj bqm po pojemnościach
    bqm = dimod.BinaryQuadraticModel(dict(linear), {k: v for k, v in quadratic.items()}, offset, dimod.BINARY)
    print("Info: Ograniczenia pojemności dodane (kwadratowo).")

    # Ograniczenie (3): Budżet: P*(sum c_i*y_i - p)^2
    budget_vars = [y_vars[i] for i in range(s) if c[i] > 0]
    if budget_vars:
        # rozwinięcie kwadratu
        for a in range(len(budget_vars)):
            va = budget_vars[a]
            ca = c[[i for i in range(s) if c[i] > 0][a]]
            linear[va] += P_LARGE * (ca * ca) * 0.0
            for b in range(a, len(budget_vars)):
                vb = budget_vars[b]
                cb = c[[i for i in range(s) if c[i] > 0][b]]
                pair = tuple(sorted((va, vb)))
                quadratic[pair] += P_LARGE * (ca * cb)
        # offset term P * p^2 (irrelevant for decision)
        offset += P_LARGE * (p * p)

        bqm = dimod.BinaryQuadraticModel(dict(linear), {k: v for k, v in quadratic.items()}, offset, dimod.BINARY)
        print("Info: Ograniczenie budżetowe (kwadratowo) dodane do BQM.")
    else:
        print("Info: Brak nowych schronów z kosztem, pomijam ograniczenie budżetowe.")

    print(f"\nInfo: Model BQM zbudowany. Liczba zmiennych: {len(bqm.variables)}")
    print("Info: Rozpoczynam wyżarzanie (NEAL)...")

    sampler = neal.SimulatedAnnealingSampler()
    sampleset = sampler.sample(bqm, num_reads=200, num_sweeps=2000)

    print(f"Info: Wyżarzanie zakończone. Całkowity czas: {time.time() - start:.2f}s")


    def is_sample_feasible(sample_dict):
        # constraint (1): sum_i x_in + z_n == 1
        for n in range(h):
            ssum = 0
            for i in valid_i_for_n[n]:
                var = x_vars[(i, n)]
                ssum += int(sample_dict.get(var, 0))
            ssum += int(sample_dict.get(z_vars[n], 0))
            if ssum != 1:
                return False
        # constraint (2) & (4): capacity sum_n x_in <= v_i*y_i  (for existing y_i=1)
        for i in range(s + e):
            ssum = 0
            for n in valid_n_for_i[i]:
                ssum += int(sample_dict.get(x_vars[(i, n)], 0))
            if i < s:
                yi = int(sample_dict.get(y_vars[i], 0))
                if ssum > v[i] * yi:
                    return False
            else:
                if ssum > v[i]:
                    return False
        # constraint (3): budget
        total_cost = 0.0
        for i in range(s):
            total_cost += float(c[i]) * int(sample_dict.get(y_vars[i], 0))
        if total_cost > p + 1e-9:
            return False
        return True

    # iterate samples and pick best feasible (lowest energy)
    best_feasible = None
    best_feasible_energy = None

    for row in sampleset.data(['sample', 'energy']):
        sample = row.sample
        energy = row.energy
        if is_sample_feasible(sample):
            if best_feasible is None or energy < best_feasible_energy:
                best_feasible = sample
                best_feasible_energy = energy

    if best_feasible is None:
        print("BŁĄD: Nie znaleziono wykonalnej próbki w wygenerowanych próbkach.")
        # zwróć najlepszą dostępną niefekasblę próbkę (jak wcześniej)
        best_sample = sampleset.first.sample
        return {"status": "no_feasible_solution_found_by_neal", "time": int((time.time() - start))}

    best_sample = best_feasible
    best_energy = best_feasible_energy

    print(f"Info: Wybrano najlepsze wykonalne rozwiązanie o energii: {best_energy}")
    print("Info: Formatowanie wyjścia zgodnie z wymaganym formatem...")

    # formatowanie
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
