"""WasteLess API - FastAPI + SQLite. Run: uvicorn main:app --reload"""
import sqlite3, secrets, hashlib
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DB = "wasteless.db"
app = FastAPI(title="WasteLess API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()

@app.on_event("startup")
def init_db():
    conn = sqlite3.connect(DB)
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY, name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS items(
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, category TEXT NOT NULL, quantity REAL NOT NULL,
        purchase_date TEXT, expiration_date TEXT NOT NULL);
    """)
    conn.commit(); conn.close()

# ---------- auth ----------
def hash_pw(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()

def current_user(authorization: str = Header(None), conn=Depends(get_db)):
    token = (authorization or "").replace("Bearer ", "")
    row = conn.execute("SELECT u.id, u.name, u.email FROM sessions s JOIN users u "
                       "ON u.id = s.user_id WHERE s.token=?", (token,)).fetchone()
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
    conn.execute("INSERT INTO sessions VALUES (?,?)", (token, user_id))
    conn.commit()
    return token

@app.post("/api/register", status_code=201)
def register(d: Register, conn=Depends(get_db)):
    if len(d.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    email = d.email.strip().lower()
    if conn.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        raise HTTPException(400, "Email already registered")
    salt = secrets.token_hex(8)
    cur = conn.execute("INSERT INTO users(name,email,password_hash,salt) VALUES (?,?,?,?)",
                       (d.name.strip(), email, hash_pw(d.password, salt), salt))
    conn.commit()
    return {"token": new_session(conn, cur.lastrowid), "name": d.name.strip()}

@app.post("/api/login")
def login(d: Login, conn=Depends(get_db)):
    u = conn.execute("SELECT * FROM users WHERE email=?", (d.email.strip().lower(),)).fetchone()
    if not u or hash_pw(d.password, u["salt"]) != u["password_hash"]:
        raise HTTPException(401, "Invalid email or password")
    return {"token": new_session(conn, u["id"]), "name": u["name"]}

@app.post("/api/logout", status_code=204)
def logout(authorization: str = Header(None), conn=Depends(get_db)):
    conn.execute("DELETE FROM sessions WHERE token=?", ((authorization or "").replace("Bearer ", ""),))
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
    sql, args = "SELECT * FROM items WHERE user_id=? AND name LIKE ?", [user["id"], f"%{q}%"]
    if category:
        sql += " AND category=?"; args.append(category)
    rows = conn.execute(sql + " ORDER BY expiration_date", args).fetchall()
    return [dict(r) for r in rows]

@app.post("/api/items", status_code=201)
def add_item(i: Item, user=Depends(current_user), conn=Depends(get_db)):
    cur = conn.execute("INSERT INTO items(user_id,name,category,quantity,purchase_date,expiration_date) "
                       "VALUES (?,?,?,?,?,?)",
                       (user["id"], i.name.strip(), i.category, i.quantity, i.purchase_date, i.expiration_date))
    conn.commit()
    return {"id": cur.lastrowid, **i.model_dump()}

@app.put("/api/items/{item_id}")
def update_item(item_id: int, i: Item, user=Depends(current_user), conn=Depends(get_db)):
    cur = conn.execute("UPDATE items SET name=?,category=?,quantity=?,purchase_date=?,expiration_date=? "
                       "WHERE id=? AND user_id=?",
                       (i.name.strip(), i.category, i.quantity, i.purchase_date, i.expiration_date, item_id, user["id"]))
    conn.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "Item not found")
    return {"id": item_id, **i.model_dump()}

@app.delete("/api/items/{item_id}", status_code=204)
def delete_item(item_id: int, user=Depends(current_user), conn=Depends(get_db)):
    cur = conn.execute("DELETE FROM items WHERE id=? AND user_id=?", (item_id, user["id"]))
    conn.commit()
    if cur.rowcount == 0:
        raise HTTPException(404, "Item not found")
