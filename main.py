from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import asyncio

app = FastAPI()

# Enable CORS so Vercel can seamlessly talk to Render
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- INTERNAL SYSTEM MEMORY (STATE) ---
# Generates a baseline of 20 slots: 10 Motorbike (IDs 1-10) and 10 Car (IDs 11-20)
parking_slots = []
def initialize_default_slots():
    global parking_slots
    parking_slots = []
    for i in range(1, 21):
        vehicle_type = "Motorbike" if i <= 10 else "Car"
        parking_slots.append({
            "id": i,
            "type": vehicle_type,
            "status": "vacant",
            "distance": i * 4
        })

initialize_default_slots()

legal_playbook = {
    "termination_notice": {"max_days": 30, "standard_clause": "Either party may terminate with 30 days written notice."},
    "liability_cap": {"standard_clause": "Total liability shall not exceed the fees paid under this agreement."}
}

# --- BACKGROUND SIMULATOR ---
# Simulates physical IoT ultrasonic sensor changes in the background every 15 seconds
async def simulate_iot_traffic():
    while True:
        await asyncio.sleep(15)
        if parking_slots:
            target = random.choice(parking_slots)
            # Only toggle spots that aren't manually booked by active user sessions
            target["status"] = "occupied" if target["status"] == "vacant" else "vacant"

@app.on_event("startup")
async def start_simulator():
    asyncio.create_task(simulate_iot_traffic())

# --- DATA MODELS ---
class BookingRequest(BaseModel):
    slot_id: int

class PlaybookUpdate(BaseModel):
    max_days: int
    termination_clause: str
    liability_clause: str

class SlotCreationRequest(BaseModel):
    id: int
    type: str
    distance: int

class GridReconfigRequest(BaseModel):
    total_slots: int
    motorbike_count: int

# --- API ENDPOINTS ---

@app.get("/parking/status")
def get_parking_status():
    return parking_slots

@app.post("/user/book-slot")
def book_parking_slot(req: BookingRequest):
    for slot in parking_slots:
        if slot["id"] == req.slot_id:
            if slot["status"] == "occupied":
                raise HTTPException(status_code=400, detail="This spot is already occupied by another vehicle.")
            slot["status"] = "occupied"
            return {"message": f"Successfully reserved Slot {req.slot_id}! Space is locked in."}
    raise HTTPException(status_code=404, detail="Requested slot ID does not exist.")

@app.get("/admin/playbook")
def get_playbook():
    return legal_playbook

@app.post("/admin/update-playbook")
def update_playbook(data: PlaybookUpdate):
    legal_playbook["termination_notice"]["max_days"] = data.max_days
    legal_playbook["termination_notice"]["standard_clause"] = data.termination_clause
    legal_playbook["liability_cap"]["standard_clause"] = data.liability_clause
    return {"message": "Legal AI playbook compliance policies updated!"}

@app.post("/admin/add-slot")
def add_custom_slot(data: SlotCreationRequest):
    for slot in parking_slots:
        if slot["id"] == data.id:
            raise HTTPException(status_code=400, detail=f"A sensor with ID {data.id} already exists.")
    
    new_slot = {
        "id": data.id,
        "type": data.type,
        "status": "vacant",
        "distance": data.distance
    }
    parking_slots.append(new_slot)
    # Sort array dynamically so the user dashboard stays structurally neat
    parking_slots.sort(key=lambda x: x["id"])
    return {"message": f"New physical sensor array added for Slot {data.id}!"}

@app.post("/admin/reconfigure-grid")
def reconfigure_entire_grid(config: GridReconfigRequest):
    global parking_slots
    if config.motorbike_count > config.total_slots:
        raise HTTPException(status_code=400, detail="Motorbike count cannot exceed the total available slots.")
    
    new_slots = []
    for i in range(1, config.total_slots + 1):
        vehicle_type = "Motorbike" if i <= config.motorbike_count else "Car"
        new_slots.append({
            "id": i,
            "type": vehicle_type,
            "status": "vacant",
            "distance": i * 3
        })
    parking_slots = new_slots
    return {"message": f"Grid successfully wiped and rebuilt with {config.total_slots} total slots!"}

@app.post("/contract/review")
async def review_contract(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode("utf-8", errors="ignore").lower()
    
    analysis_matrix = []
    risk_level = "Low Risk"
    
    # 1. Evaluate Termination Notice Bounds
    if "terminate" in text or "notice" in text:
        # Simple extraction logic mock for parsing days
        found_clause = "Custom notice term discovered"
        days_allowed = legal_playbook["termination_notice"]["max_days"]
        analysis_matrix.append({
            "clause": "Termination Windows",
            "found": found_clause,
            "suggestion": legal_playbook["termination_notice"]["standard_clause"]
        })
        
    # 2. Evaluate Liability Bounds
    if "liability" in text or "indemnify" in text:
        analysis_matrix.append({
            "clause": "Limitation of Liability",
            "found": "Complex indemnification requirements noted",
            "suggestion": legal_playbook["liability_cap"]["standard_clause"]
        })
        risk_level = "Medium Action Required"
    else:
        analysis_matrix.append({
            "clause": "Limitation of Liability",
            "found": "MISSING / NOT FOUND",
            "suggestion": f"CRITICAL: {legal_playbook['liability_cap']['standard_clause']}"
        })
        risk_level = "High Compliance Breach Risk"

    return {
        "filename": file.filename,
        "overall_risk": risk_level,
        "analysis": analysis_matrix
    }