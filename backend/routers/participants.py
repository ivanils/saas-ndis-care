# backend/routers/participants.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import supabase_admin
import schemas
from dependencies import get_current_user, CurrentUser
from datetime import datetime, timezone

router = APIRouter(
    prefix="/participants",
    tags=["Participants"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.ParticipantResponse)
def create_participant(participant: schemas.ParticipantCreate, badge: CurrentUser = Depends(get_current_user)):
    """
    Registers a new NDIS participant for the agency.
    """
    try:
        # Convert Pydantic model to dict and inject the agency_id from the security badge
        data = participant.model_dump(mode="json")
        data["agency_id"] = str(badge.agency_id)
        
        # Insert using the admin client to bypass RLS safely
        response = supabase_admin.table("participants").insert(data).execute()
        return response.data[0]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Failed to create participant: {str(e)}"
        )

@router.get("/", response_model=List[schemas.ParticipantResponse])
def get_participants(badge: CurrentUser = Depends(get_current_user)):
    """
    Retrieves all active participants belonging to the user's agency.
    """
    try:
        # Query the database enforcing the Multi-Tenant boundary
        response = supabase_admin.table("participants") \
            .select("*") \
            .eq("agency_id", str(badge.agency_id)) \
            .is_("deleted_at", "null") \
            .order("last_name") \
            .execute()
            
        return response.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Failed to fetch participants: {str(e)}"
        )
        
@router.get("/{participant_id}", response_model=schemas.ParticipantResponse)
def get_participant(participant_id: str, badge: CurrentUser = Depends(get_current_user)):
    """
    Retrieves a specific participant by their ID.
    Enforces multi-tenant security by ensuring the participant belongs to the user's agency.
    """
    try:
        response = supabase_admin.table("participants") \
            .select("*") \
            .eq("id", participant_id) \
            .eq("agency_id", str(badge.agency_id)) \
            .is_("deleted_at", "null") \
            .execute()
            
        # If the list comes back empty, it means either the participant doesn't exist or doesn't belong to this agency --> we return a 404
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Participant not found or access denied."
            )
            
        return response.data[0] # Ret
        
    except HTTPException:
        raise # 404 error raised
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Failed to fetch participant: {str(e)}"
        )
        
@router.patch("/{participant_id}", response_model=schemas.ParticipantResponse)
def update_participant(participant_id: str, participant_data: schemas.ParticipantUpdate, badge: CurrentUser = Depends(get_current_user)):
    """
    Updates an existing participant's details.
    """
    try:
        # 1. Clean data: keep only the fields the user actually wants to change
        update_dict = {k: v for k, v in participant_data.model_dump(exclude_unset=True).items() if v is not None}
        
        if not update_dict:
             raise HTTPException(status_code=400, detail="No fields provided for update.")

        # 2. Update securely (filtering by agency_id and ignoring deleted participants)
        response = supabase_admin.table("participants") \
            .update(update_dict) \
            .eq("id", participant_id) \
            .eq("agency_id", str(badge.agency_id)) \
            .is_("deleted_at", "null") \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Participant not found or access denied.")
            
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update participant: {str(e)}")


@router.delete("/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(participant_id: str, badge: CurrentUser = Depends(get_current_user)):
    """
    Soft-deletes a participant. 
    In healthcare, we don't physically delete records, we archive them using 'deleted_at'.
    """
    try:
        # Get the current time in UTC
        now = datetime.now(timezone.utc).isoformat()
        
        # We use UPDATE instead of DELETE to perform a Soft Delete
        response = supabase_admin.table("participants") \
            .update({"deleted_at": now}) \
            .eq("id", participant_id) \
            .eq("agency_id", str(badge.agency_id)) \
            .is_("deleted_at", "null") \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Participant not found or already deleted.")

        return 
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete participant: {str(e)}")