# SmartKirana — AI Supply Chain Management

A full-stack AI-powered inventory and supply chain app for Kirana stores.

## Project Structure

```
supply_demand-final/
├── frontend/       → React + Vite frontend (port 5173)
└── backend/        → FastAPI + Python backend (port 8000)
```

## Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Recharts
- **Backend**: FastAPI, SQLAlchemy, SQLite, PyTorch (GRU model)
- **Auth**: JWT (python-jose)
