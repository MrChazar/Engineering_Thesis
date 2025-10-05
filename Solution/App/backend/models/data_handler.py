import pandas as pd
import numpy as np


def add_shelter(x: float, y: float, capacity: int, cost: float):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\unified_data.csv"
    data = pd.read_csv(path, sep=";")

    # Sprawdzenie, czy schron już istnieje
    if ((data["x"] == x) & (data["y"] == y) & (data["type"] == "new_shelter")).any():
        return {"status": "exists"}

    # Nowy rekord
    new_id = int(data["id"].max()) + 1 if not data.empty else 0
    new_row = {
        "id": new_id,
        "x": float(x),
        "y": float(y),
        "type": "new_shelter",
        "capacity": int(capacity),
        "cost": float(cost)
    }

    # Dodanie i zapis
    data.loc[len(data)] = new_row
    data.to_csv(path, sep=";", index=False)

    return {"status": "ok"}


def add_residental_building(x: float, y: float):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\data.csv"
    data = pd.read_csv(path, sep=";")

    # Sprawdzenie, czy punkt już istnieje
    if ((data["x"] == x) & (data["y"] == y) & (data["type"] == "residental")).any():
        return {"status": "exists"}

    new_id = data["id"].max() + 1 if not data["id"].empty else 0
    new_row = {
        "id": new_id,
        "x": x,
        "y": y,
        "type": "residental",
        "capacity": 0,
        "cost": 0
    }

    # Dodanie i zapis
    data.loc[len(data)] = new_row
    data.to_csv(path, sep=";", index=False)

    return {"status": "ok"}