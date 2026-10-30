"""WasteLess API - FastAPI + Postgres (Neon). Run locally: uvicorn main:app --reload"""
import os, secrets, hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DATABASE_URL = os.environ.get("DATABASE_URL")  # Neon connection string (use the pooled one)

# Allowed frontends: local dev + your Vercel URL(s), comma-separated in FRONTEND_URL
origins = ["http://localhost:5173"] + [
    o.strip().rstrip("/") for o in os.getenv("FRONTEND_URL", "").split(",") if o.strip()
]

app = FastAPI(title="WasteLess API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if os.getenv("ALLOW_VERCEL_PREVIEWS") else None,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY, name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS items(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, category TEXT NOT NULL, quantity DOUBLE PRECISION NOT NULL,
    purchase_date TEXT, expiration_date TEXT NOT NULL);
"""

_ready = False  # schema is created once per server instance (works on serverless too)

def get_db():
    global _ready
    if not DATABASE_URL:
        raise HTTPException(500, "DATABASE_URL is not configured")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        if not _ready:
            with conn.cursor() as cur:
                cur.execute(SCHEMA)
            conn.commit()
            _ready = True
        yield conn
    finally:
        conn.close()

def run(conn, sql, args=()):
    cur = conn.cursor()
    cur.execute(sql, args)
    return cur

# ---------- auth ----------
def hash_pw(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()

def current_user(authorization: str = Header(None), conn=Depends(get_db)):
    token = (authorization or "").replace("Bearer ", "")
    row = run(conn, "SELECT u.id, u.name, u.email FROM sessions s JOIN users u "
                    "ON u.id = s.user_id WHERE s.token=%s", (token,)).fetchone()
    if not row:
        raise HTTPException(401, "Not authenticated")
    return dict(row)

class Register(BaseModel):
    name: str
    email: str
    password: str

class Login(BaseModel):
    email: str
    password: str

def new_session(conn, user_id):
    token = secrets.token_hex(24)
    run(conn, "INSERT INTO sessions(token, user_id) VALUES (%s,%s)", (token, user_id))
    conn.commit()
    return token

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/register", status_code=201)
def register(d: Register, conn=Depends(get_db)):
    if len(d.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    email = d.email.strip().lower()
    if run(conn, "SELECT 1 FROM users WHERE email=%s", (email,)).fetchone():
        raise HTTPException(400, "Email already registered")
    salt = secrets.token_hex(8)
    cur = run(conn, "INSERT INTO users(name,email,password_hash,salt) VALUES (%s,%s,%s,%s) RETURNING id",
              (d.name.strip(), email, hash_pw(d.password, salt), salt))
    user_id = cur.fetchone()["id"]
    conn.commit()
    return {"token": new_session(conn, user_id), "name": d.name.strip()}

@app.post("/api/login")
def login(d: Login, conn=Depends(get_db)):
    u = run(conn, "SELECT * FROM users WHERE email=%s", (d.email.strip().lower(),)).fetchone()
    if not u or hash_pw(d.password, u["salt"]) != u["password_hash"]:
        raise HTTPException(401, "Invalid email or password")
    return {"token": new_session(conn, u["id"]), "name": u["name"]}

@app.post("/api/logout", status_code=204)
def logout(authorization: str = Header(None), conn=Depends(get_db)):
    run(conn, "DELETE FROM sessions WHERE token=%s", ((authorization or "").replace("Bearer ", ""),))
    conn.commit()

# ---------- inventory ----------
class Item(BaseModel):
    name: str
    category: str
    quantity: float
    purchase_date: str | None = None
    expiration_date: str

@app.get("/api/items")
def list_items(q: str = "", category: str = "", user=Depends(current_user), conn=Depends(get_db)):
    sql, args = "SELECT * FROM items WHERE user_id=%s AND name ILIKE %s", [user["id"], f"%{q}%"]
    if category:
        sql += " AND category=%s"; args.append(category)
    rows = run(conn, sql + " ORDER BY expiration_date", args).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/items", status_code=201)
def add_item(i: Item, user=Depends(current_user), conn=Depends(get_db)):
    cur = run(conn, "INSERT INTO items(user_id,name,category,quantity,purchase_date,expiration_date) "
                    "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
              (user["id"], i.name.strip(), i.category, i.quantity, i.purchase_date, i.expiration_date))
    new_id = cur.fetchone()["id"]
    conn.commit()
    return {"id": new_id, **i.model_dump()}

@app.put("/api/items/{item_id}")
def update_item(item_id: int, i: Item, user=Depends(current_user), conn=Depends(get_db)):
    cur = run(conn, "UPDATE items SET name=%s,category=%s,quantity=%s,purchase_date=%s,expiration_date=%s "
                    "WHERE id=%s AND user_id=%s",
              (i.name.strip(), i.category, i.quantity, i.purchase_date, i.expiration_date, item_id, user["id"]))
    conn.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "Item not found")
    return {"id": item_id, **i.model_dump()}

@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: int, user=Depends(current_user), conn=Depends(get_db)):
    cur = run(conn, "DELETE FROM items WHERE id=%s AND user_id=%s", (item_id, user["id"]))
    conn.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "Item not found")
