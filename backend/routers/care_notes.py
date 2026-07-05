# backend/routers/care_notes.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

import schemas
from database import supabase_admin
from dependencies import CurrentUser, get_current_user

router = APIRouter(
    prefix="/care-notes",
    tags=["Care Notes"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.CareNoteResponse)
def create_care_note(note: schemas.CareNoteCreate, badge: CurrentUser = Depends(get_current_user)):
    """
    Creates a new care note for a participant.
    """
    try:
        # 1. Convert Pydantic model to dict and inject security context
        note_data = note.model_dump(mode="json")
        note_data["agency_id"] = str(badge.agency_id)
        note_data["worker_id"] = str(badge.id) # The person writing the note is always the current user

        # 2. Verify the participant belongs to this agency
        participant_check = supabase_admin.table("participants") \
            .select("id") \
            .eq("id", str(note_data["participant_id"])) \
            .eq("agency_id", str(badge.agency_id)) \
            .is_("deleted_at", "null") \
            .execute()
        if not participant_check.data:
            raise HTTPException(status_code=404, detail="Participant not found.")

        # 3. Insert into the database using admin client (bypassing RLS because Python is the guard)
        response = supabase_admin.table("care_notes").insert(note_data).execute()

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create care note: {str(e)}"
        )

@router.get("/participant/{participant_id}", response_model=List[schemas.CareNoteResponse])
def get_participant_care_notes(participant_id: str, badge: CurrentUser = Depends(get_current_user)):
    """
    Retrieves all care notes for a specific participant.
    Both admins and workers can view this history to provide informed care,
    as long as the participant belongs to their agency.
    """
    try:
        # Use admin client to query, but STRICTLY enforce the multi-tenant boundary
        query = supabase_admin.table("care_notes") \
            .select("*") \
            .eq("participant_id", participant_id) \
            .eq("agency_id", str(badge.agency_id)) \
            .order("created_at", desc=True) # Show newest notes first

        response = query.execute()

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch care notes: {str(e)}"
        )
