import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

import schemas
from database import supabase, supabase_admin

logger = logging.getLogger(__name__)

# Creating a router for authentication-related endpoints
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register_agency_and_admin(user_data: schemas.UserRegister):
    """Registers a new Agency and its first Admin user."""
    user_id = None
    agency_id = None
    try:
        # 1. Create the user in Supabase Auth first.
        #    The most common failure (duplicate email) surfaces here before any
        #    DB state is written, so the happy path avoids orphaned records.
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "first_name": user_data.first_name,
                    "last_name": user_data.last_name
                }
            }
        })
        user_id = auth_response.user.id

        # 2. Create the agency record in the database
        agency_response = supabase_admin.table("agencies").insert({"name": user_data.agency_name}).execute()
        agency_id = agency_response.data[0]["id"]

        # 3. Stamp agency_id and role onto the Auth user's app_metadata
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            {"app_metadata": {"agency_id": agency_id, "role": "admin"}}
        )

        # 4. Create the user's profile in public.profiles
        supabase_admin.table("profiles").upsert({
            "id": user_id,
            "agency_id": agency_id,
            "role": "admin",
            "first_name": user_data.first_name,
            "last_name": user_data.last_name
        }).execute()

        return {"message": "Agency and Admin user registered successfully! You can now log in."}

    except Exception as e:
        # Compensating transactions: undo created resources in reverse dependency order.
        # Auth user is deleted first — its ON DELETE CASCADE removes any profile row —
        # so the agency FK constraint is satisfied before the agency delete runs.
        # Each step is isolated so a cleanup failure does not block the other.
        if user_id:
            try:
                supabase_admin.auth.admin.delete_user(user_id)
            except Exception as cleanup_err:
                logger.error(
                    "CLEANUP FAILED: orphaned auth user %s could not be deleted "
                    "after registration failure. Manual intervention required. "
                    "Original error: %s | Cleanup error: %s",
                    user_id, e, cleanup_err,
                )
        if agency_id:
            try:
                supabase_admin.table("agencies").delete().eq("id", agency_id).execute()
            except Exception as cleanup_err:
                logger.error(
                    "CLEANUP FAILED: orphaned agency %s could not be deleted "
                    "after registration failure. Manual intervention required. "
                    "Original error: %s | Cleanup error: %s",
                    agency_id, e, cleanup_err,
                )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login")
def login(credentials: schemas.UserLogin):
    """
    Authenticates a user and returns their JWT token.
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}"
        )
