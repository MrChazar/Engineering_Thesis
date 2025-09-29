import pandas as pd
import numpy as np


def add_shelter(x: float, y: float, capacity: int, cost: float):
    new_shelter_data = pd.read_csv(
        "C:\\Users\\jakub\\Documents\\GitHub\\Engineering_Thesis\\Solution\\App\\backend\\models\\data\\new_shelters.csv",
        sep=";"
    )

    if ((new_shelter_data["x"] == x) & (new_shelter_data["y"] == y)).any():
        return {"status": "exists"}

    new_shelter_data.loc[len(new_shelter_data)] = [len(new_shelter_data)+1, x, y, capacity, cost]
    new_shelter_data.to_csv(
        path_or_buf="C:\\Users\\jakub\\Documents\\GitHub\\Engineering_Thesis\\Solution\\App\\backend\\models\\data\\new_shelters.csv",
        sep=";", index=False)
    return {"status": "ok"}


def add_residental_building(x: float, y: float):
    residental_data = pd.read_csv(
        "C:\\Users\\jakub\Documents\\GitHub\\Engineering_Thesis\\Solution\\App\\backend\\models\\data\\residental_buildings.csv",
        sep=";")

    if ((residental_data["x"] == x) & (residental_data["y"] == y)).any():
        return {"status": "exists"}

    residental_data.loc[len(residental_data)] = ["id", "residential", None, y, x]
    residental_data.to_csv(path_or_buf="C:\\Users\\jakub\Documents\\GitHub\\Engineering_Thesis\\Solution\\App\\backend\\models\\data\\residental_buildings.csv",
                           sep=";", index=False)
    return {"status": "ok"}