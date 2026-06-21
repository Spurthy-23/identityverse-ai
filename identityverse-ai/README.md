# IdentityVerse AI

Full-stack AI-powered Identity Sprawl & Privileged Access Abuse Detection platform.
Backend (FastAPI + ML + Gemini) is fully built and tested. Frontend (React + Vite +
Tailwind) has all 10 dashboard pages wired to real backend data.

---

## 1. Install prerequisites (one-time)

You need **Node.js 18+** and **Python 3.10+**.

- **VS Code**: download from https://code.visualstudio.com — install the
  **Python** extension and the **ES7+ React/Redux/JS snippets** extension (optional but helpful).
- **Node.js**: https://nodejs.org (LTS version). Verify with `node --version`.
- **Python**: https://www.python.org/downloads/ — on Windows, check "Add Python to PATH"
  during install. Verify with `python --version` (or `python3 --version` on Mac/Linux).

Open this whole `identityverse-ai` folder in VS Code: `File → Open Folder`.

---

## 2. Run the backend

Open a terminal in VS Code (`` Ctrl+` ``), then:

```bash
cd backend
python -m venv venv

# Activate the virtual environment:
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows (cmd or PowerShell)

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
First startup takes **10-15 seconds** — it's auto-generating 500 synthetic identities,
10,000 audit logs, and running the risk-scoring + ML pipeline. You'll see log lines
ending in `IdentityVerse AI backend ready.` Subsequent restarts are instant since the
data is cached in `backend/app/data/identityverse.json`.

Leave this terminal running. Confirm it works by opening
**http://localhost:8000/health** in a browser — you should see
`{"status":"ok","identities_loaded":500}`. Full interactive API docs are at
**http://localhost:8000/docs**.

No `.env` file is required to run locally — Gemini calls automatically fall back to
templated (still useful) responses if `GEMINI_API_KEY` isn't set. To enable real AI
output, copy `backend/.env.example` to `backend/.env` and add your key from
https://aistudio.google.com/apikey.

---

## 3. Run the frontend

Open a **second** VS Code terminal (keep the backend one running):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the dashboard should load with live data from the
backend. No `.env` needed locally (it defaults to `http://localhost:8000`); copy
`frontend/.env.example` to `.env` only if you deploy the backend elsewhere.

---

## 4. What's already working

| Page | Status |
|---|---|
| Executive Dashboard | ✅ live charts (risk distribution, department risk) |
| Identity DNA Explorer | ✅ filterable/searchable identity table |
| Identity Profile (DNA helix, risk factors, AI remediation) | ✅ |
| Identity Graph (force-directed) | ✅ |
| Blast Radius | ✅ |
| Orphan Accounts | ✅ |
| Dormant Admins | ✅ |
| Privilege Creep Timeline | ✅ (derived from audit log events) |
| AI Copilot (chat) | ✅ rule-based + Gemini fallback |
| Remediation Center | ✅ checklist UI with AI-generated steps |

Backend pipeline (resolver → risk scoring → ML anomaly detection → graph → blast
radius → Gemini) has been run and tested end-to-end via FastAPI's test client before
this was handed to you — every endpoint above returns real data, not placeholders.

---

## 5. If something doesn't start

- **`uvicorn: command not found`** — your venv isn't activated. Re-run the `source venv/bin/activate` (or Windows equivalent) line.
- **Frontend shows no data / network error in browser console** — the backend terminal isn't running, or crashed. Check it's still showing `Uvicorn running on http://127.0.0.1:8000`.
- **Port already in use** — something else is using 8000 or 5173. Run backend on a different port: `uvicorn app.main:app --reload --port 8001`, then update `frontend/.env`'s `VITE_API_URL` to match.
- **`pip install` fails on a package** — make sure you're using Python 3.10+ (`python --version`).

---

## 6. Architecture

```
Synthetic Data Generator (Faker)
        ↓
Identity Resolver (rapidfuzz username matching)
        ↓
Risk Scoring Engine (deterministic rules)
        ↓
ML Anomaly Detection (Isolation Forest, blended in)
        ↓
NetworkX Graph (Identity Graph + Blast Radius)
        ↓
Gemini AI (remediation + copilot, with templated fallback)
        ↓
FastAPI REST API  →  React/Vite/Tailwind Dashboard
```

Full technical build rationale (why TinyDB instead of MongoDB for local dev, why
risk scoring is rule-based not pure ML, etc.) is documented as comments at the top
of each service file in `backend/app/services/`.
