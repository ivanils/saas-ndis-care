from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from database import supabase, supabase_admin
import schemas

# Creating a router for authentication-related endpoints
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register_agency_and_admin(user_data: schemas.UserRegister):
    """Registers a new Agency and its first Admin user."""
    try:
        # 1. Creating the new agency in the ddbb
        agency_response = supabase_admin.table("agencies").insert({"name": user_data.agency_name}).execute()
        new_agency = agency_response.data[0]  # Get the newly created agency record
        agency_id = new_agency["id"]
        
        # 2. Register the user in Supabase Auth
        # We pass the agency_id and role inside the app_metadata -> dependencies.py
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
        supabase_admin.auth.admin.update_user_by_id(
            user_id,
            {"app_metadata": {"agency_id": agency_id, "role": "admin"}}
        )
        
        #3. Create the user's profile in public.profiles table
        supabase_admin.table("profiles").upsert({
            "id": user_id,
            "agency_id": agency_id,
            "role": "admin",
            "first_name": user_data.first_name,
            "last_name": user_data.last_name
        }).execute()
        
        return{"message": "Agency and Admin user registered successfully! You can now log in."}
    except Exception as e:
        # print(f"[ERROR] Registration failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
@router.post("/login")
def login(credentials: schemas.UserLogin):
    """
    Authenticates a user and returns theri JWT token.
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        return{
            "access_token": response.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        # print(f"\n[CRITICAL LOGIN ERROR] -> {str(e)}\n")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error: {str(e)}"
        )