#backend/routers/shifts.py
from fastapi import APIRouter, Depends, HTTPException, status
from database import supabase_admin
import schemas
from dependencies import get_current_user
from typing import List

router = APIRouter(
    prefix="/shifts",
    tags=["Shifts"],
    #Inject our own keeper
    #No paths will work without a valid token
    dependencies=[Depends(get_current_user)]
)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_shift(shift: schemas.ShiftCreate, badge = Depends(get_current_user)):
    """
    Creates a new shift for a given worker.
    The badge (CurrentUser) is injected by our dependency and contains the user's agency_id and role.
    """
    try:
        # 1.Force the shift asociation to the user's agency (multi-tenancy)
        shift_data = shift.model_dump(mode="json") # Convert Pydantic model to dict
        shift_data["agency_id"] = str(badge.agency_id)
       
       #If user is a worker, force the worker_id to be its own id
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
        # print(f"[ERROR] Failed to create shift: {e}")
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
        # 1. Start the query using our admin client, filtering by the user's agency immediately
        # use of supabase_admin because we are orchestrating the security layer here in Python
        from database import supabase_admin
        query = supabase_admin.table("shifts").select("*").eq("agency_id", str(badge.agency_id))
        
        #2. Add extra filters based on the user's role
        #Admins don't need extra filters, they see everything in their agency
        if badge.role == "worker":
            query = query.eq("worker_id", str(badge.id))
        
        #3. Execute the query and return results
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
        from database import supabase_admin
        #1. Clean the incoming data, removing any None values (only update provided fields) so we don't overwrite existing data with nulls
        update_dict = {k: v for k, v in shift_data.model_dump(exclude_unset=True).items() if v is not None}
        
        if not update_dict:
             raise HTTPException(status_code=400, detail="No fields provided for update.")
        
        #2. Build the secure query
        query = supabase_admin.table("shifts").update(update_dict).eq("id", shift_id).eq("agency_id", str(badge.agency_id))
        
        #3. Add worker restriction for non-admins
        if badge.role == "worker":
            query = query.eq("worker_id", str(badge.id))
            
        #4. Execute the query
        response = query.execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Shift not found or you don't have permission to update it.")
        
        return response.data[0] # Return the updated shift
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update shift: {str(e)}"
        )
    