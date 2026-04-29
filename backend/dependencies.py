# backend/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase
from pydantic import BaseModel, UUID4

# HTTPBearer is FastAPI's built-in tool to extract the "Authorization: Bearer <token>" header
security = HTTPBearer()

class CurrentUser(BaseModel):
    """
    Schema representing the authenticated user's context.
    This will be injected into our endpoints.
    """
    id: UUID4
    agency_id: UUID4
    role: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """
    Dependency function to validate the JWT token against Supabase 
    and extract the user's agency_id and role.
    """
    token = credentials.credentials
    
    # --- DEBUG PRINT 1: The Token ---
    # print(f"\n{'='*50}")
    # print(f"[DEBUG 1] Raw Token received: {token[:15]}...")
    
    try:
        # 1. Ask Supabase to verify the token and return the user profile
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        # --- DEBUG PRINT 2: The User from Supabase ---
        print(f"[DEBUG 2] Supabase validated the token! User ID: {user.id}")

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        # 2. Extract our custom Multi-tenant claims from the JWT app_metadata
        app_metadata = user.app_metadata
        
        # --- DEBUG PRINT 3: The Secret Backpack (app_metadata) ---
        # print(f"[DEBUG 3] Full app_metadata dictionary: {app_metadata}")
        
        agency_id = app_metadata.get("agency_id")
        role = app_metadata.get("role", "worker") # Default to 'worker' if missing

        # 3. Fail fast if the user is an orphan (no agency)
        if not agency_id:
            print("[DEBUG ERROR] User has no agency_id. Blocking access.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to any agency. Access denied.",
            )

        # 4. Return the clean, validated context
        
        # --- DEBUG PRINT 4: The Final Badge ---
        # print(f"[DEBUG 4] Access Granted! Badge -> Agency: {agency_id} | Role: {role}")
        # print(f"{'='*50}\n")
        
        return CurrentUser(
            id=user.id,
            agency_id=agency_id,
            role=role
        )

    except Exception as e:
        # Catch expired tokens or tampered signatures
        
        # print(f"\n[DEBUG ERROR] Authentication failed: {str(e)}\n")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )