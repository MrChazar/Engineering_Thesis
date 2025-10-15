import math
import numpy as np
import pandas as pd
from geopy.distance import geodesic
from gurobipy import Model, GRB, quicksum
import sqlite3
import math
import numpy as np
import pandas as pd
from geopy.distance import geodesic
from gurobipy import Model, GRB, quicksum

DB_PATH = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\database.db"

def get_shelter_allocation(budget: float, allowedDistance: float, averagePersonPerBuilding: int):
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

    L_existing = [[row["x"], row["y"]] for row in existing_shelters]
    L_new = [[row["x"], row["y"]] for row in new_shelters]
    L = L_new + L_existing

    s = len(L_new)
    e = len(L_existing)
    h = len(residential_buildings)
    p = budget
    K = 100

    M = [[row["x"], row["y"]] for row in residential_buildings]

    r = [[geodesic(l, m).kilometers for m in M] for l in L]
    r = np.array(r)

    # Koszty i pojemności
    c = [row["cost"] for row in new_shelters] + [0] * e
    v = [int(row["capacity"] / averagePersonPerBuilding) for row in new_shelters] + \
        [int(row["capacity"] / averagePersonPerBuilding) for row in existing_shelters]

    model = Model("shelter_location")

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
    obj = (
            quicksum(r[i, n] * x[(i, n)] for i in range(s + e) for n in range(h))
            + quicksum(c[i] * y[i] for i in range(s + e))
            + quicksum(K * z[n] for n in range(h))
    )

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

        for i, coords in enumerate(L):
            if i < s:
                point_id = ids_new[i]
                schron_type = "built_shelter" if y[i].X > 0.5 else "potential_shelter"
                cost = c[i]
            else:
                point_id = ids_existing[i - s]
                schron_type = "built_shelter"
                cost = 0

            points.append({
                "id": int(point_id),
                "type": schron_type,
                "cost": cost,
                "assigned_to": None,
                "x": coords[0],
                "y": coords[1],
                "capacity": int(v[i])*averagePersonPerBuilding
            })

        # mieszkania
        for n, coords in enumerate(M):
            assigned_to = None
            for i in range(s + e):
                if x[(i, n)].X > 0.5:
                    assigned_to = ids_new[i] if i < s else ids_existing[i - s]
                    break

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

        return {
            "points": points,
            "objective": float(model.objVal),
            "used_budget": used_budget,
        }
    else:
        return {"status": "no_optimal_solution"}
