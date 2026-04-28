#backend/routers/shifts.py
from fastapi import APIRouter, Depends, HTTPException, status
from database import supabase
import schemas
from routers.auth import get_current_user

router = APIRouter(
    prefix="/shifts",
    tags=["Shifts"],
    #Inject our own keeper
    #No paths will work without a valid token
    dependencies=[Depends(get_current_user)]
)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_shift(shift: schemas.ShiftCreate, badge: dict = Depends(get_current_user)):
    """
    Creates a new shift for a given worker.
    The badge (CurrentUser) is injected by our dependency and contains the user's agency_id and role.
    """
    try:
        # 1.Force the shift asociation to the user's agency (multi-tenancy)
        shift_data = shift.model_dump() # Convert Pydantic model to dict
        shift_data["agency_id"] = badge["agency_id"]
       
       #If user is a worker, force the worker_id to be its own id
        if badge["role"] == "worker":
              shift_data["worker_id"] = badge["id"]
        
        # 2. Insert the new shift into the database
        response = supabase.table("shifts").insert(shift_data).execute()
        
        return {"message": "Shift created successfully!", "shift_id": response.data[0]}
    
    except Exception as e:
        print(f"[ERROR] Failed to create shift: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )