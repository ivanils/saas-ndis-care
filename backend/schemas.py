# backend/schemas.py
from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional
from enum import Enum

# --- ENUMS (Mirroring Database Enums) ---
class UserRole(str, Enum):
    admin = 'admin'
    worker = 'worker'

class ShiftStatus(str, Enum):
    pending_approval = 'pending_approval'
    approved = 'approved'
    disputed = 'disputed'

# --- SHIFTS SCHEMAS ---
# Schema for receiving data from Next.js (Create)
class ShiftCreate(BaseModel):
    worker_id: Optional[UUID4] = None # Optional, workers can't choose their worker_id.
    participant_id: UUID4
    start_time: datetime
    end_time: Optional[datetime] = None

# Schema for updating a shift (PATCH)
class ShiftUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[ShiftStatus] = None

# Schema for sending data back to Next.js (Read)
class ShiftResponse(BaseModel):
    id: UUID4
    agency_id: UUID4
    worker_id: UUID4
    participant_id: UUID4
    start_time: datetime
    end_time: Optional[datetime]
    status: ShiftStatus
    created_at: datetime

    class Config:
        from_attributes = True # Allows Pydantic to read ORM/Database objects important!

# --- CARE NOTES SCHEMAS ---
class CareNoteCreate(BaseModel):
    participant_id: UUID4
    shift_id: Optional[UUID4] = None
    content: str

class CareNoteResponse(BaseModel):
    id: UUID4
    agency_id: UUID4
    worker_id: UUID4
    participant_id: UUID4
    shift_id: Optional[UUID4]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
        
# AUTH SCHEMAS
class UserRegister(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    agency_name: str
    
# PROFILES SCHEMAS
class ProfileResponse(BaseModel):
    id: UUID4
    agency_id: UUID4
    role: str
    first_name: str
    last_name: str

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None


# PARTICIPANT SCHEMAS
class UserLogin(BaseModel):
    email: str
    password: str
    
class ParticipantCreate(BaseModel):
    first_name: str
    last_name: str
    ndis_id: Optional[str] = None
    emergency_contact:str
    medical_alerts: Optional[str] = None
    
class ParticipantResponse(BaseModel):
    id: UUID4
    agency_id: UUID4
    first_name: str
    last_name: str
    ndis_id: Optional[str]
    emergency_contact: str
    medical_alerts: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class ParticipantUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    ndis_id: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_alerts: Optional[str] = None
    
