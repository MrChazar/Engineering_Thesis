import sqlite3
import hashlib
import os
import datetime
from jose import JWTError, jwt
from datetime import datetime, timedelta

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "database.db")

SECRET_KEY = "KLUCZ_TAJNY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 2

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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


def login(login: str, password: str):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, email, password_hash, salt 
        FROM users 
        WHERE substr(email, 1, instr(email, '@') - 1) = ?
    """, (login,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    user_id, email, stored_hash, salt = row
    if stored_hash != hash_password(password, salt):
        return None

    access = create_access_token({"sub": email})
    refresh = create_refresh_token({"sub": email})
    return {"access_token": access, "refresh_token": refresh}