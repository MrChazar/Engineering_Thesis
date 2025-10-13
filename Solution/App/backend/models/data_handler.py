import pandas as pd
import numpy as np
import sqlite3
import hashlib
import os



def add_shelter(x: float, y: float, capacity: int, cost: float):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\data.csv"
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

def edit_shelter(id: int, x: float, y: float, capacity: float, cost: float):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\data.csv"
    data = pd.read_csv(path, sep=";")

    mask = (data["id"] == id) & (data["type"] == "new_shelter")
    if not mask.any():
        return {"status": "not_found"}

    data.loc[mask, ["x", "y", "capacity", "cost"]] = [float(x), float(y), float(capacity), float(cost)]
    data.to_csv(path, sep=";", index=False)

    return {"status": "ok"}

def delete_shelter(id: int):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\data.csv"
    data = pd.read_csv(path, sep=";")

    mask = (data["id"] == id) & (data["type"] == "new_shelter")
    if not mask.any():
        return {"status": "not_found"}

    data = data.loc[~mask]
    data.to_csv(path, sep=";", index=False)

    return {"status": "ok"}


def add_residential_building(x: float, y: float):
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


def edit_residential_building(id: int, x: float, y: float):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\data.csv"
    data = pd.read_csv(path, sep=";")

    mask = (data["id"] == id) & (data["type"] == "residental")
    if not mask.any():
        return {"status": "not_found"}

    data.loc[mask, ["x", "y"]] = [float(x), float(y)]
    data.to_csv(path, sep=";", index=False)

    return {"status": "ok"}


def delete_residential_building(id: int):
    path = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\data.csv"
    data = pd.read_csv(path, sep=";")

    mask = (data["id"] == id) & (data["type"] == "residental")
    if not mask.any():
        return {"status": "not_found"}

    data = data.loc[~mask]
    data.to_csv(path, sep=";", index=False)

    return {"status": "ok"}


DB_PATH = "users.db"

def get_connection():
    """Tworzy połączenie z bazą SQLite (i tworzy tabelę, jeśli jej nie ma)."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL
    )
    """)
    conn.commit()
    return conn


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def register(name: str, surname: str, email: str, password: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cur.fetchone():
        conn.close()
        return False

    salt = os.urandom(16).hex()
    password_hash = hash_password(password, salt)

    cur.execute("""
        INSERT INTO users (name, surname, email, password_hash, salt)
        VALUES (?, ?, ?, ?, ?)
    """, (name, surname, email, password_hash, salt))

    conn.commit()
    conn.close()
    return True


def login(login: str, password: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()

    # W SQLite wybieramy rekord, gdzie login (część przed @) pasuje do podanego loginu
    cur.execute("""
        SELECT password_hash, salt 
        FROM users 
        WHERE substr(email, 1, instr(email, '@') - 1) = ?
    """, (login,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return False  # użytkownik nie istnieje

    stored_hash, salt = row
    input_hash = hash_password(password, salt)
    return stored_hash == input_hash
