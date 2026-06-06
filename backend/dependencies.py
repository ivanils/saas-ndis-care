# backend/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase
from pydantic import BaseModel
from uuid import UUID  # Standard type for maximum compatibility

security = HTTPBearer()

class CurrentUser(BaseModel):
    id: UUID
    agency_id: UUID
    role: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """
    Validates the JWT token against Supabase.
    Assumes the token contains 'agency_id' and 'role' in 'app_metadata'
    via the Database Hook configured in Supabase.
    """
    token = credentials.credentials
    
    try:
        # 1. Validate against Supabase Auth engine (cryptographically secure)
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        # 2. Extract claims from token payload
        # If the Hook is properly configured, this will never fail.
        app_metadata = user.app_metadata or {}
        agency_id = app_metadata.get("agency_id")
        role = app_metadata.get("role")

        # 3. Business integrity validation
        if not agency_id or not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User claims missing in token. Contact admin.",
            )

        # 4. Return CurrentUser object (Pydantic will validate types automatically)
        return CurrentUser(
            id=user.id,
            agency_id=agency_id,
            role=role
        )

    except HTTPException:
        # Re-raise known 401/403 errors
        raise
    except Exception as e:
        # Generic error for internal failure or expired/malformed token
        print(f"[CRITICAL ERROR in get_current_user]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )