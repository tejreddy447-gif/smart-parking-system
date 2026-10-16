from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from contextlib import asynccontextmanager
import random
import asyncio

import models
from database import engine, get_db

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

# --- SEED DEFAULT SLOTS IF DB IS EMPTY ---
def seed_default_slots():
    db = next(get_db())
    try:
        existing_count = db.query(models.ParkingSlot).count()
        if existing_count == 0:
            for i in range(1, 21):
                slot = models.ParkingSlot(
                    id=i,
                    type="Motorbike" if i <= 10 else "Car",
                    status="vacant",
                    distance=i * 4
                )
                db.add(slot)
            
            # Seed legal playbook
            db.add(models.LegalPlaybook(
                key="termination_notice",
                max_days=30,
                standard_clause="Either party may terminate with 30 days written notice."
            ))
            db.add(models.LegalPlaybook(
                key="liability_cap",
                max_days=None,
                standard_clause="Total liability shall not exceed the fees paid under this agreement."
            ))
            db.commit()
    finally:
        db.close()

seed_default_slots()

# --- BACKGROUND IOT SIMULATOR ---
async def simulate_iot_traffic():
    while True:
        await asyncio.sleep(15)
        db = next(get_db())
        try:
            slots = db.query(models.ParkingSlot).all()
            if slots:
                target = random.choice(slots)
                target.status = "occupied" if target.status == "vacant" else "vacant"
                db.commit()
        finally:
            db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(simulate_iot_traffic())
    yield
    task.cancel()

app = FastAPI(title="Smart Parking DB API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC SCHEMAS ---
class BookingRequest(BaseModel):
    slot_id: int

class SlotCreationRequest(BaseModel):
    id: int
    type: str
    distance: int

class GridReconfigRequest(BaseModel):
    total_slots: int
    motorbike_count: int

# --- API ENDPOINTS WITH DB ---

@app.get("/parking/status")
def get_parking_status(db: Session = Depends(get_db)):
    return db.query(models.ParkingSlot).order_by(models.ParkingSlot.id).all()

@app.post("/user/book-slot")
def book_parking_slot(req: BookingRequest, db: Session = Depends(get_db)):
    slot = db.query(models.ParkingSlot).filter(models.ParkingSlot.id == req.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Requested slot ID does not exist.")
    if slot.status == "occupied":
        raise HTTPException(status_code=400, detail="This spot is already occupied.")
    
    slot.status = "occupied"
    # Log booking history
    db.add(models.BookingLog(slot_id=req.slot_id))
    db.commit()
    return {"message": f"Successfully reserved Slot {req.slot_id}! State saved to SQLite DB."}

@app.post("/admin/add-slot")
def add_custom_slot(data: SlotCreationRequest, db: Session = Depends(get_db)):
    existing = db.query(models.ParkingSlot).filter(models.ParkingSlot.id == data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Slot ID {data.id} already exists in DB.")
    
    new_slot = models.ParkingSlot(id=data.id, type=data.type, status="vacant", distance=data.distance)
    db.add(new_slot)
    db.commit()
    return {"message": f"New slot {data.id} saved to SQLite DB!"}

@app.post("/admin/reconfigure-grid")
def reconfigure_entire_grid(config: GridReconfigRequest, db: Session = Depends(get_db)):
    if config.motorbike_count > config.total_slots:
        raise HTTPException(status_code=400, detail="Motorbike count cannot exceed total slots.")
    
    # Wipe existing slots and replace
    db.query(models.ParkingSlot).delete()
    for i in range(1, config.total_slots + 1):
        vehicle_type = "Motorbike" if i <= config.motorbike_count else "Car"
        db.add(models.ParkingSlot(id=i, type=vehicle_type, status="vacant", distance=i * 3))
    db.commit()
    return {"message": f"Grid reconfigured with {config.total_slots} slots in SQLite DB!"}