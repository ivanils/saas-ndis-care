#backend/routers/shifts.py
from fastapi import APIRouter, Depends, HTTPException, status
from database import supabase_admin
import schemas
from dependencies import get_current_user
from typing import List

router = APIRouter(
    prefix="/shifts",
    tags=["Shifts"],
    # All routes require a valid JWT
    dependencies=[Depends(get_current_user)]
)

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
       
        # Workers can only create shifts for themselves
        if badge.role == "worker":
              shift_data["worker_id"] = str(badge.id)
        elif badge.role == "admin":
            if not shift_data.get("worker_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Admin users must specify a worker_id for the shift.",
                )
        # 2. Insert the new shift into the database
        response = supabase_admin.table("shifts").insert(shift_data).execute()
        
        return {"message": "Shift created successfully!", "shift_id": response.data[0]}
    
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
    Workers can only update their own shifts.
    """
    try:
        # 1. Strip unset/None fields so we don't overwrite existing data with nulls
        update_dict = {k: v for k, v in shift_data.model_dump(exclude_unset=True).items() if v is not None}

        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields provided for update.")

        # 2. Build the secure query scoped to the user's agency
        query = supabase_admin.table("shifts").update(update_dict).eq("id", shift_id).eq("agency_id", str(badge.agency_id))

        # 3. Workers can only update their own shifts
        if badge.role == "worker":
            query = query.eq("worker_id", str(badge.id))

        # 4. Execute
        response = query.execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Shift not found or you don't have permission to update it.")
        
        return response.data[0] # Return the updated shift
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update shift: {str(e)}"
        )
    