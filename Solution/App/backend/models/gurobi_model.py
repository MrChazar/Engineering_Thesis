import numpy as np
import sqlite3
import time
import cupy as cp
from gurobipy import Model, GRB, quicksum

DB_PATH = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\database.db"

def haversine_gpu(lats1, lons1, lats2, lons2):
    R = 6371.0  # km
    lat1 = cp.radians(lats1)[:, None]
    lon1 = cp.radians(lons1)[:, None]
    lat2 = cp.radians(lats2)[None, :]
    lon2 = cp.radians(lons2)[None, :]

    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = cp.sin(dlat/2)**2 + cp.cos(lat1) * cp.cos(lat2) * cp.sin(dlon/2)**2
    c = 2 * cp.arcsin(cp.sqrt(a))
    return R * c


def get_shelter_allocation(budget: float, allowedDistance: float, averagePersonPerBuilding: int):
    start = time.time()
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

    ids_existing = [row["id"] for row in existing_shelters]
    ids_new = [row["id"] for row in new_shelters]
    ids_res = [row["id"] for row in residential_buildings]

    L_existing = np.array([[row["x"], row["y"]] for row in existing_shelters])
    L_new = np.array([[row["x"], row["y"]] for row in new_shelters])
    L = np.vstack([L_new, L_existing])

    s = len(L_new)
    e = len(L_existing)
    h = len(residential_buildings)
    p = budget
    K = 100
    w1, w2, w3 = 0.5, 0.1, 0.4
    M = np.array([[row["x"], row["y"]] for row in residential_buildings])

    r_gpu = haversine_gpu(
        cp.array(L[:, 0]), cp.array(L[:, 1]),
        cp.array(M[:, 0]), cp.array(M[:, 1])
    )
    r = cp.asnumpy(r_gpu)

    c = [row["cost"] for row in new_shelters] + [0] * e
    v = [int(row["capacity"] / averagePersonPerBuilding) for row in new_shelters] + \
        [int(row["capacity"] / averagePersonPerBuilding) for row in existing_shelters]
    capacity = [row["capacity"] for row in new_shelters] + [row["capacity"] for row in existing_shelters]
    model = Model("shelter_location")
    model.setParam("Threads", 16)        # liczba wątków
    model.setParam("ConcurrentMIP", 1)   # równoległy MIP

    x, y, z = {}, {}, {}
    for i in range(s + e):
        y[i] = model.addVar(vtype=GRB.BINARY, name=f"y_{i}")
    for n in range(h):
        z[n] = model.addVar(vtype=GRB.BINARY, name=f"z_{n}")
    for i in range(s + e):
        for n in range(h):
            x[(i, n)] = model.addVar(vtype=GRB.BINARY, name=f"x_{i}_{n}")

    model.update()


    # funkcja celu
    F1 = quicksum(r[i, n] * x[(i, n)] for i in range(s + e) for n in range(h))
    F2 = quicksum(c[i] * y[i] for i in range(s + e))
    F3 = quicksum(K * z[n] for n in range(h))
    obj = (w1 * F1 + w2 * F2 + w3 * F3)
    model.setObjective(obj, GRB.MINIMIZE)

    # ograniczenia – każdy obiekt przypisany dokładnie do 1 schronu
    for n in range(h):
        model.addConstr(quicksum(x[(i, n)] for i in range(s + e)) + z[n] == 1, name=f"assign_{n}")

    # ograniczenia – pojemności
    for i in range(s + e):
        model.addConstr(quicksum(x[(i, n)] for n in range(h)) <= v[i] * y[i], name=f"cap_{i}")

    # ograniczenie – maksymalna odległość
    for i in range(s + e):
        for n in range(h):
            if r[i, n] > allowedDistance:
                model.addConstr(x[(i, n)] == 0, name=f"dist_{i}_{n}")

    # budżet
    model.addConstr(quicksum(c[i] * y[i] for i in range(s + e)) <= p, name="budget")

    for i in range(s, s + e):
        model.addConstr(y[i] == 1)
    model.optimize()

    if model.status == GRB.OPTIMAL:
        points = []
        total_population = h * averagePersonPerBuilding
        assigned_buildings = 0
        total_distance = 0.0
        built_shelters = 0
        total_built_cost = 0
        total_capacity_used = 0
        total_capacity_available = 0

        for i, coords in enumerate(L):
            if i < s:
                point_id = ids_new[i]
                schron_type = "built_shelter" if y[i].X > 0.5 else "potential_shelter"
                cost = c[i]
                if y[i].X > 0.5:
                    built_shelters += 1
                    total_built_cost += cost
                    total_capacity_available += capacity[i]
            else:
                point_id = ids_existing[i - s]
                schron_type = "built_shelter"
                cost = 0
                total_capacity_available += capacity[i]

            points.append({
                "id": int(point_id),
                "type": schron_type,
                "cost": cost,
                "assigned_to": None,
                "x": coords[0],
                "y": coords[1],
                "capacity": capacity[i]
            })

        for n, coords in enumerate(M):
            assigned_to = None
            dist_to_shelter = None
            for i in range(s + e):
                if x[(i, n)].X > 0.5:
                    assigned_to = ids_new[i] if i < s else ids_existing[i - s]
                    dist_to_shelter = r[i, n]
                    break

            if assigned_to:
                assigned_buildings += 1
                total_distance += dist_to_shelter
                total_capacity_used += averagePersonPerBuilding

            points.append({
                "id": int(ids_res[n]),
                "type": "apartment",
                "cost": None,
                "assigned_to": assigned_to,
                "x": coords[0],
                "y": coords[1],
                "capacity": None
            })

        used_budget = sum(c[i] * int(round(y[i].X)) for i in range(s + e))

        stats = {
            "total_population": total_population,
            "covered_population": assigned_buildings * averagePersonPerBuilding,
            "percent_covered": round((assigned_buildings / h) * 100, 2),
            "average_distance": round(total_distance / assigned_buildings, 3) if assigned_buildings > 0 else 0,
            "total_built_cost": round(total_built_cost),
            "average_cost_built": round(total_built_cost / built_shelters, 2) if built_shelters > 0 else 0,
            "built_shelters": built_shelters,
            "capacity_fill_percent": round((total_capacity_used / total_capacity_available) * 100, 2) if total_capacity_available > 0 else 0
        }

        return {
            "points": points,
            "objective": float(model.objVal),
            "used_budget": used_budget,
            "time": int((time.time() - start) / 60),
            "stats": stats
        }

    return {"status": "no_optimal_solution"}
