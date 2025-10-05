import math
import numpy as np
import pandas as pd
from geopy.distance import geodesic
from gurobipy import Model, GRB, quicksum


import math
import numpy as np
import pandas as pd
from geopy.distance import geodesic
from gurobipy import Model, GRB, quicksum


def get_shelter_allocation(budget: float, allowedDistance: float):

    data = pd.read_csv("C:\\Users\\jakub\\Documents\\GitHub\\Engineering_Thesis\\Solution\\App\\backend\\models\\data\\data.csv",
        sep=";"
    )
    existing_shelter_data = data[(data["type"] == "existing_shelter")]
    new_shelter_data = data[(data["type"] == "new_shelter")]
    residental_data =  data[(data["type"] == "residental")]

    # Nowe i istniejące schrony
    L_existing = existing_shelter_data[["x", "y"]].values.tolist()
    L_new = new_shelter_data[["x", "y"]].values.tolist()
    L = L_new + L_existing

    s = len(L_new)
    e = len(L_existing)
    h = len(residental_data)
    p = budget
    K = 100
    d = allowedDistance
    g = 10

    M = residental_data[["x", "y"]].values.tolist()

    # Odległości r_{i,n}
    r = [[geodesic(l, m).kilometers for m in M] for l in L]
    r = np.array(r)

    # Koszty i pojemności
    c = list(new_shelter_data["cost"]) + [0] * e
    v = list((new_shelter_data["capacity"] / 10).astype(int)) + list((existing_shelter_data["capacity"] / g).astype(int))

    model = Model("shelter_location")

    # decyzje
    x = {}
    y = {}
    z = {}

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
            if r[i, n] > d:
                model.addConstr(x[(i, n)] == 0, name=f"dist_{i}_{n}")

    # budżet
    model.addConstr(quicksum(c[i] * y[i] for i in range(s + e)) <= p, name="budget")

    for i in range(s, s + e):
        model.addConstr(y[i] == 1)

    model.optimize()

    if model.status == GRB.OPTIMAL:
        points = []
        id_counter = 0

        # schrony
        for i, coords in enumerate(L):
            if i < s:
                # nowe lokalizacje
                schron_type = "built_shelter" if y[i].X > 0.5 else "potential_shelter"
                cost = c[i]
            else:
                # istniejące zawsze aktywne
                schron_type = "built_shelter"
                cost = 0

            points.append({
                "id": id_counter,
                "type": schron_type,
                "cost": cost,
                "assigned_to": None,
                "x": coords[0],
                "y": coords[1],
            })
            id_counter += 1

        # mieszkania
        for n, coords in enumerate(M):
            assigned_to = None
            for i in range(s + e):
                if x[(i, n)].X > 0.5:
                    assigned_to = i
                    break

            points.append({
                "id": id_counter,
                "type": "apartment",
                "cost": None,
                "assigned_to": assigned_to,
                "x": coords[0],
                "y": coords[1],
            })
            id_counter += 1

        used_budget = sum(c[i] * int(round(y[i].X)) for i in range(s + e))

        return {
            "points": points,
            "objective": float(model.objVal),
            "used_budget": used_budget,
        }

    else:
        return {"status": "no_optimal_solution"}
