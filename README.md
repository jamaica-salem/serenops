# Serenops

A full-stack web app for managing the end-to-end client lifecycle:
leads, onboarding, proposals, contracts, invoices, payments, projects, tasks, revisions, timeline, and handover.

## Stack
- Backend: FastAPI + MongoDB
- Frontend: React + Tailwind

## Quick Setup

### 1. Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=panze
JWT_SECRET=change-this-secret
CORS_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

Run backend:
```bash
cd backend
uvicorn server:app --reload --port 8001
```

### 2. Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm install ajv@^8 --legacy-peer-deps
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Run frontend:
```bash
cd frontend
npm start
```

## App URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8001/api`
