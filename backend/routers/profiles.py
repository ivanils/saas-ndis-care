# backend/routers/profiles.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

import schemas
from database import supabase_admin
from dependencies import CurrentUser, get_current_user

router = APIRouter(
    prefix="/profiles",
    tags=["Team / Profiles"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[schemas.ProfileResponse])
def get_team_members(badge: CurrentUser = Depends(get_current_user)):
    """
    Retrieves all team members (admins and workers) belonging to the user's agency.
    Used to populate dropdowns when assigning shifts.
    """
    try:
        response = supabase_admin.table("profiles") \
            .select("*") \
            .eq("agency_id", str(badge.agency_id)) \
            .order("first_name") \
            .execute()

        return response.data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch team members: {str(e)}"
        )

@router.get("/{profile_id}", response_model=schemas.ProfileResponse)
def get_profile(profile_id: str, badge: CurrentUser = Depends(get_current_user)):
    """
    Retrieves a specific team member's profile by their ID.
    Enforces multi-tenant security (agency_id).
    """
    try:
        response = supabase_admin.table("profiles") \
            .select("*") \
            .eq("id", profile_id) \
            .eq("agency_id", str(badge.agency_id)) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found or access denied."
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch profile: {str(e)}"
        )


@router.patch("/{profile_id}", response_model=schemas.ProfileResponse)
def update_profile(profile_id: str, profile_data: schemas.ProfileUpdate, badge: CurrentUser = Depends(get_current_user)):
    """
    Updates an existing team member's profile.
    """
    try:
        # 1. Clean the data: exclude fields the user didn't send
        update_dict = {k: v for k, v in profile_data.model_dump(exclude_unset=True).items() if v is not None}

        if not update_dict:
             raise HTTPException(status_code=400, detail="No fields provided for update.")

        # 2. Add extra security logic (Business Rule): Only admins can change roles
        if "role" in update_dict and badge.role != "admin":
            raise HTTPException(status_code=403, detail="Only administrators can change roles.")

        # 3. Execute the update with agency_id boundary
        response = supabase_admin.table("profiles") \
            .update(update_dict) \
            .eq("id", profile_id) \
            .eq("agency_id", str(badge.agency_id)) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found or access denied.")

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update profile: {str(e)}"
        )
