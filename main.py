import random
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# --- SECURITY: CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA STORAGE (In-Memory) ---
parking_slots = [
    {"id": 1, "status": "vacant", "type": "Standard", "distance": 10},
    {"id": 2, "status": "occupied", "type": "Standard", "distance": 12},
    {"id": 3, "status": "vacant", "type": "EV Charging", "distance": 15},
    {"id": 4, "status": "occupied", "type": "Handicap", "distance": 5},
]

LEGAL_PLAYBOOK = {
    "termination_notice": {
        "max_days": 30,
        "standard_clause": "Either party may terminate this agreement with 30 days written notice."
    },
    "liability_cap": {
        "required": True,
        "standard_clause": "Total liability shall not exceed the fees paid in the previous 12 months."
    }
}

# --- INPUT VALIDATION SCHEMAS ---
class PlaybookUpdate(BaseModel):
    max_days: int
    termination_clause: str
    liability_clause: str

class NewSlotInput(BaseModel):
    id: int
    type: str
    distance: int

# NEW: Schema to handle a user trying to book a specific slot
class SlotBookingInput(BaseModel):
    slot_id: int


# --- PARKING SIMULATION ENGINE ---
async def simulate_occupancy_logic():
    while True:
        for slot in parking_slots:
            # Only randomly change slots that aren't actively managed/interrupted immediately
            if random.random() < 0.2:
                slot["status"] = "occupied" if slot["status"] == "vacant" else "vacant"
        await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulate_occupancy_logic())


# --- USER ENDPOINTS ---

@app.get("/parking/status")
async def get_parking_status():
    return parking_slots

# NEW FEATURE: User interaction endpoint to book a vacant slot
@app.post("/user/book-slot")
async def book_parking_slot(data: SlotBookingInput):
    """Allows a standard user to select and instantly occupy a vacant slot."""
    global parking_slots
    
    # 1. Look for the requested slot in our list
    target_slot = next((slot for slot in parking_slots if slot["id"] == data.slot_id), None)
    
    # 2. Check if the slot exists
    if target_slot is None:
        raise HTTPException(status_code=404, detail=f"Parking slot ID {data.slot_id} does not exist.")
        
    # 3. Check if the slot is already occupied
    if target_slot["status"] == "occupied":
        raise HTTPException(status_code=400, detail=f"Reservation failed. Slot ID {data.slot_id} is already taken.")
        
    # 4. Book the slot successfully
    target_slot["status"] = "occupied"
    return {"message": f"Success! Parking slot {data.slot_id} has been reserved for your vehicle."}


@app.post("/contract/review")
async def review_contract(file: UploadFile = File(...)):
    await asyncio.sleep(1) 
    return {
        "filename": file.filename,
        "overall_risk": "High",
        "analysis": [
            {
                "clause": "Termination",
                "risk": "High",
                "found": "90-day notice period",
                "suggestion": LEGAL_PLAYBOOK["termination_notice"]["standard_clause"]
            },
            {
                "clause": "Liability",
                "risk": "Medium",
                "found": "Uncapped liability",
                "suggestion": LEGAL_PLAYBOOK["liability_cap"]["standard_clause"]
            }
        ]
    }


# --- ADMIN ENDPOINTS ---

@app.get("/admin/playbook")
async def get_playbook():
    return LEGAL_PLAYBOOK

@app.post("/admin/update-playbook")
async def update_playbook(data: PlaybookUpdate):
    global LEGAL_PLAYBOOK
    LEGAL_PLAYBOOK["termination_notice"]["max_days"] = data.max_days
    LEGAL_PLAYBOOK["termination_notice"]["standard_clause"] = data.termination_clause
    LEGAL_PLAYBOOK["liability_cap"]["standard_clause"] = data.liability_clause
    return {"message": "Playbook rules successfully updated by administrator!"}

@app.post("/admin/add-slot")
async def add_parking_slot(data: NewSlotInput):
    global parking_slots
    if any(s["id"] == data.id for s in parking_slots):
        raise HTTPException(status_code=400, detail="Slot ID already exists")
        
    new_slot = {
        "id": data.id,
        "status": "vacant",
        "type": data.type,
        "distance": data.distance
    }
    parking_slots.append(new_slot)
    return {"message": f"Slot {data.id} provisioned successfully!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)