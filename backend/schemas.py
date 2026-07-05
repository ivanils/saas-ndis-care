# backend/schemas.py
from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --- ENUMS (Mirroring Database Enums) ---
class UserRole(str, Enum):
    admin = 'admin'
    worker = 'worker'

class ShiftStatus(str, Enum):
    assigned = "assigned"               # Grey/blue - Assigned but not started
    in_progress = "in_progress"         # Yellow - worker clocked in but not clocked out yet
    completed = "completed"             # Orange - worker clocked out
    pending_approval = "pending_approval" # Orange - Waiting for Admin review
    approved = "approved"               # Green - Ready for invoicing
    disputed = "disputed"               # Red - There is an issue with the hours
    cancelled = "cancelled"             # Dark Gray - Shift cancelled

# --- SHIFTS SCHEMAS ---
# Schema for receiving data from Next.js (Create)

class ShiftCreate(BaseModel):
    worker_id: Optional[UUID] = None # Optional, workers can't choose their worker_id.
    participant_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    status: ShiftStatus = ShiftStatus.assigned

# Schema for updating a shift (PATCH)
class ShiftUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[ShiftStatus] = None
    # location data for clock-in and clock-out (optional, but can be used for auditing and compliance)
    clock_in_lat: Optional[float] = Field(None, ge=-90, le=90)
    clock_in_lng: Optional[float] = Field(None, ge=-180, le=180)
    clock_out_lat: Optional[float] = Field(None, ge=-90, le=90)
    clock_out_lng: Optional[float] = Field(None, ge=-180, le=180)

# Schema for sending data back to Next.js (Read)
class ShiftResponse(BaseModel):
    id: UUID
    agency_id: UUID
    worker_id: UUID
    participant_id: UUID
    start_time: datetime
    end_time: Optional[datetime]
    status: ShiftStatus
    clock_in_lat: Optional[float] = None
    clock_in_lng: Optional[float] = None
    clock_out_lat: Optional[float] = None
    clock_out_lng: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True # Allows Pydantic to read ORM/Database objects important!

# --- CARE NOTES SCHEMAS ---
class CareNoteCreate(BaseModel):
    participant_id: UUID
    shift_id: Optional[UUID] = None
    content: str = Field(..., min_length=1, max_length=10000)
    media_urls: Optional[List[str]] = [] # Supabase storage URLs for any photos or files attached to the note
    signature_url: Optional[str] = None  #Patient or worker signature URL (if required for compliance)

class CareNoteResponse(BaseModel):
    id: UUID
    agency_id: UUID
    worker_id: UUID
    participant_id: UUID
    shift_id: Optional[UUID]
    content: str
    media_urls: Optional[List[str]]
    signature_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# AUTH SCHEMAS
class UserRegister(BaseModel):
    email: str
    password: str
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    agency_name: str = Field(..., min_length=1, max_length=200)

class UserLogin(BaseModel):
    email: str
    password: str

# PROFILES SCHEMAS
class ProfileResponse(BaseModel):
    id: UUID
    agency_id: UUID
    role: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = None
    avatar_url: Optional[str] = None


# PARTICIPANT SCHEMAS

class ParticipantCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    ndis_id: Optional[str] = None
    emergency_contact: str
    medical_alerts: Optional[str] = None
    avatar_url: Optional[str] = None

class ParticipantResponse(BaseModel):
    id: UUID
    agency_id: UUID
    first_name: str
    last_name: str
    ndis_id: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_alerts: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ParticipantUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    ndis_id: Optional[str] = None
    emergency_contact: Optional[str] = None
    medical_alerts: Optional[str] = None
    avatar_url: Optional[str] = None
