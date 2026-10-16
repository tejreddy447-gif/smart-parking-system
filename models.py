from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, default="Car")         # Car, Motorbike, EV Charging, Handicap
    status = Column(String, default="vacant")    # vacant, occupied
    distance = Column(Integer, default=0)

class BookingLog(Base):
    __tablename__ = "booking_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    slot_id = Column(Integer, index=True)
    booked_at = Column(DateTime, default=datetime.utcnow)

class LegalPlaybook(Base):
    __tablename__ = "legal_playbook"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True) # e.g. 'termination_notice'
    max_days = Column(Integer, nullable=True)
    standard_clause = Column(String)