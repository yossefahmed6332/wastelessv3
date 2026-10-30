# WasteLess
Household food-waste tracker (UN SDG 12.3). React + Vite + Tailwind frontend, FastAPI + SQLite backend.

## Run locally
**Backend** (Python 3.10+), terminal 1:
```
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
API: http://localhost:8000 · interactive docs: http://localhost:8000/docs

**Frontend** (Node 18+), terminal 2:
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (Vite proxies `/api` to the backend).

## Structure
- `backend/main.py` – all routes, auth (salted PBKDF2 + session tokens), SQLite tables
- `frontend/src/api.js` – fetch helper + date helpers (expiry = simple day comparison)
- `frontend/src/pages/` – Home, Auth, Inventory, Expiring

## Progress
- [x] Phase 1: Home, auth, inventory CRUD + search/filter, expiration tracker
- [ ] Phase 2: recipes · Phase 3: shopping list · Phase 4: waste tracker + Recharts
