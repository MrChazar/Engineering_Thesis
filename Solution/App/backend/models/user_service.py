import sqlite3
import hashlib
import os
import datetime
from jose import JWTError, jwt
from datetime import datetime, timedelta

DB_PATH = r"C:\Users\jakub\Documents\GitHub\Engineering_Thesis\Solution\App\backend\models\data\database.db"
SECRET_KEY = "JAN_PAWEŁ_DRUGI"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


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

    token = create_access_token({"sub": email})
    return token
