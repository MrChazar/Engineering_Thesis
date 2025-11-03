import sqlite3
import hashlib
import os

DB_PATH = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\database.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def add_shelter(x: float, y: float, capacity: int, cost: float):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM shelters WHERE x=? AND y=? AND type='new_shelter'", (x, y))
    if cur.fetchone():
        conn.close()
        return {"status": "exists"}

    cur.execute("""
        INSERT INTO shelters (x, y, capacity, cost, type)
        VALUES (?, ?, ?, ?, 'new_shelter')
    """, (x, y, capacity, cost))
    conn.commit()
    conn.close()
    return {"status": "ok"}


def edit_shelter(id: int, x: float, y: float, capacity: float, cost: float):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM shelters WHERE id=? AND type='new_shelter'", (id,))
    if not cur.fetchone():
        conn.close()
        return {"status": "not_found"}

    cur.execute("""
        UPDATE shelters 
        SET x=?, y=?, capacity=?, cost=?
        WHERE id=? AND type='new_shelter'
    """, (x, y, capacity, cost, id))
    conn.commit()
    conn.close()
    return {"status": "ok"}


def delete_shelter(id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("DELETE FROM shelters WHERE id=? AND type='new_shelter'", (id,))
    if cur.rowcount == 0:
        conn.close()
        return {"status": "not_found"}

    conn.commit()
    conn.close()
    return {"status": "ok"}


def add_residential_building(x: float, y: float):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM residential_buildings WHERE x=? AND y=?", (x, y))
    if cur.fetchone():
        conn.close()
        return {"status": "exists"}

    cur.execute("INSERT INTO residential_buildings (x, y) VALUES (?, ?)", (x, y))
    conn.commit()
    conn.close()
    return {"status": "ok"}


def edit_residential_building(id: int, x: float, y: float):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("UPDATE residential_buildings SET x=?, y=? WHERE id=?", (x, y, id))
    if cur.rowcount == 0:
        conn.close()
        return {"status": "not_found"}

    conn.commit()
    conn.close()
    return {"status": "ok"}


def delete_residential_building(id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("DELETE FROM residential_buildings WHERE id=?", (id,))
    if cur.rowcount == 0:
        conn.close()
        return {"status": "not_found"}

    conn.commit()
    conn.close()
    return {"status": "ok"}