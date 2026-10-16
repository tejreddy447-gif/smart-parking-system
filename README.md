# Smart City IoT & Legal AI Suite

A full-stack dashboard application combining a simulated smart-parking IoT grid with an automated legal contract review toolkit. The backend exposes an asynchronous FastAPI service that simulates sensor telemetry, provides grid administration endpoints, and runs simple contract analysis against a configurable legal playbook.

## 🚀 Highlights (newly committed)

- Python FastAPI backend (main.py) with an async background IoT simulator that toggles parking slot occupancy every 15 seconds.
- In-memory parking grid with dynamic reconfiguration and administrative endpoints to add slots, rebuild the entire grid, and update legal playbook policies.
- Contract review endpoint that performs a basic text analysis for termination and liability clauses and returns a simple risk summary.
- Lifespan manager using an asynccontextmanager to run and cancel the simulator task cleanly on startup/shutdown.

---

## 🛠️ Tech Stack

- Frontend: React (see /frontend)
- Backend: Python 3.8+, FastAPI, Uvicorn, Pydantic, asyncio
- Languages: JavaScript (UI), Python (API/Simulator), HTML/CSS

---

## 🔧 Installation & Run (Backend)

1. Clone the repository

```bash
git clone https://github.com/tejreddy447-gif/smart-parking-system.git
cd smart-parking-system
```

2. (Optional) Create and activate a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate  # macOS / Linux
.\.venv\Scripts\activate   # Windows (PowerShell)
```

3. Install Python dependencies

```bash
pip install -r requirements.txt
```

4. Run the API locally with Uvicorn

```bash
# development mode (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open http://127.0.0.1:8000/docs to view FastAPI interactive docs.

---

## API Endpoints (summary)

- GET / -> health/status
  - Returns: {"status": "online", "message": "Smart City & Legal AI Backend is running."}

- GET /parking/status -> returns current list of parking slots with id, type, status, distance

- POST /user/book-slot
  - Body (JSON): {"slot_id": <int>}
  - Reserves a vacant slot; returns 400 if already occupied or 404 if slot id not found.

- POST /admin/add-slot
  - Body (JSON): {"id": <int>, "type": "Motorbike"|"Car", "distance": <int>}
  - Adds a custom slot. Returns 400 if id already exists.

- POST /admin/reconfigure-grid
  - Body (JSON): {"total_slots": <int>, "motorbike_count": <int>}
  - Rebuilds the entire grid (wipes current in-memory slots). Returns 400 if motorbike_count > total_slots.

- GET /admin/playbook -> returns current legal playbook configuration

- POST /admin/update-playbook
  - Body (JSON): {"max_days": <int>, "termination_clause": "...", "liability_clause": "..."}
  - Updates the legal playbook policies used by the contract reviewer.

- POST /contract/review
  - Form upload: accepts a text file (UploadFile). Performs a lightweight scan for "terminate", "notice", "liability", "indemnify" and returns an analysis matrix and overall risk level.

Examples (curl):

```bash
# Get parking status
curl http://127.0.0.1:8000/parking/status

# Book slot 3
curl -X POST http://127.0.0.1:8000/user/book-slot -H "Content-Type: application/json" -d '{"slot_id":3}'

# Reconfigure grid: 30 slots, 8 motorbikes
curl -X POST http://127.0.0.1:8000/admin/reconfigure-grid -H "Content-Type: application/json" -d '{"total_slots":30, "motorbike_count":8}'

# Upload contract for review
curl -F "file=@/path/to/contract.txt" http://127.0.0.1:8000/contract/review
```

---

## Notes & Development

- The backend currently uses an in-memory data store (parking_slots). This is suitable for demos and development but not for production. Persist to a database for production usage.
- CORS is enabled for all origins to simplify local frontend integration. Lock this down in production.
- The async simulator (simulate_iot_traffic) randomly toggles a slot's status every 15 seconds. It runs under an app-level lifespan manager to ensure it starts/stops cleanly.

---

## Frontend

See the frontend/README.md for development scripts and build instructions. The frontend is a standard Create React App project that communicates with the backend API.

---

## Contributing

Contributions welcome — open an issue or submit a pull request. If you change backend behavior, update README and the frontend accordingly.

---

## License

This repository does not include a license file. Add a LICENSE if you intend to publish under an open-source license.
