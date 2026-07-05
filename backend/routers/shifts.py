#backend/routers/shifts.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

import schemas
from database import supabase_admin
from dependencies import get_current_user

router = APIRouter(
    prefix="/shifts",
    tags=["Shifts"],
    # All routes require a valid JWT
    dependencies=[Depends(get_current_user)]
)

WORKER_ALLOWED_STATUSES = {"in_progress", "completed", "pending_approval"}

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_shift(shift: schemas.ShiftCreate, badge = Depends(get_current_user)):
    """
    Creates a new shift for a given worker.
    The badge (CurrentUser) is injected by our dependency and contains the user's agency_id and role.
    """
    try:
        # 1. Enforce agency association for multi-tenancy
        shift_data = shift.model_dump(mode="json") # Convert Pydantic model to dict
        shift_data["agency_id"] = str(badge.agency_id)

        # Workers can only create shifts for themselves and cannot choose the initial status
        if badge.role == "worker":
            shift_data["worker_id"] = str(badge.id)
            shift_data["status"] = "assigned"
        elif badge.role == "admin":
            if not shift_data.get("worker_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Admin users must specify a worker_id for the shift.",
                )
            # Verify the worker belongs to this agency
            worker_check = supabase_admin.table("profiles") \
                .select("id") \
                .eq("id", str(shift_data["worker_id"])) \
                .eq("agency_id", str(badge.agency_id)) \
                .execute()
            if not worker_check.data:
                raise HTTPException(status_code=404, detail="Worker not found.")

        # 2. Verify the participant belongs to this agency
        participant_check = supabase_admin.table("participants") \
            .select("id") \
            .eq("id", str(shift_data["participant_id"])) \
            .eq("agency_id", str(badge.agency_id)) \
            .is_("deleted_at", "null") \
            .execute()
        if not participant_check.data:
            raise HTTPException(status_code=404, detail="Participant not found.")

        # 3. Insert the new shift into the database
        response = supabase_admin.table("shifts").insert(shift_data).execute()

        return {"message": "Shift created successfully!", "shift_id": response.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=List[schemas.ShiftResponse])
def get_shifts(badge = Depends(get_current_user)):
    """
    Retrieves a list of shifts.
    - Admins see all shifts for their agency.
    - Workers see only their assigned shifts.
    """
    try:
        # 1. Filter by agency immediately — supabase_admin bypasses RLS so we enforce it here
        query = supabase_admin.table("shifts").select("*").eq("agency_id", str(badge.agency_id))

        # 2. Workers only see their own shifts; admins see all agency shifts
        if badge.role == "worker":
            query = query.eq("worker_id", str(badge.id))

        # 3. Execute and return
        response = query.execute()

        # FastAPI and Pydantic will automatically format this list into our ShiftResponse schema
        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch shifts: {str(e)}"
        )

@router.patch("/{shift_id}", response_model=schemas.ShiftResponse)
def update_shift(shift_id: str, shift_data: schemas.ShiftUpdate, badge = Depends(get_current_user)):
    """
    Updates an existing shift.
    Admins can update any shift in their agency.
    Workers can only update their own shifts (with restricted status values).
    """
    try:
        # 1. Strip unset/None fields so we don't overwrite existing data with nulls
        update_dict = {k: v for k, v in shift_data.model_dump(exclude_unset=True).items() if v is not None}

        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields provided for update.")

        # 2. Workers cannot set privileged statuses
        if badge.role == "worker" and "status" in update_dict:
            if update_dict["status"] not in WORKER_ALLOWED_STATUSES:
                raise HTTPException(status_code=403, detail="Workers cannot set this status.")

            # Prevent starting a shift that has already ended
            if update_dict["status"] == "in_progress":
                from datetime import datetime, timedelta, timezone
                current = supabase_admin.table("shifts") \
                    .select("start_time, end_time") \
                    .eq("id", shift_id) \
                    .maybe_single() \
                    .execute()
                if current.data:
                    end_time_str = current.data.get("end_time")
                    start_time_str = current.data.get("start_time")
                    now = datetime.now(timezone.utc)
                    if end_time_str:
                        cutoff = datetime.fromisoformat(end_time_str)
                    else:
                        cutoff = datetime.fromisoformat(start_time_str) + timedelta(hours=2)
                    if now > cutoff:
                        raise HTTPException(status_code=400, detail="Cannot start a shift that has already passed.")

        # 3. Build the secure query scoped to the user's agency
        query = supabase_admin.table("shifts").update(update_dict).eq("id", shift_id).eq("agency_id", str(badge.agency_id))

        # 4. Workers can only update their own shifts
        if badge.role == "worker":
            query = query.eq("worker_id", str(badge.id))

        # 5. Execute
        response = query.execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Shift not found or you don't have permission to update it.")

        return response.data[0] # Return the updated shift

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update shift: {str(e)}"
        )
