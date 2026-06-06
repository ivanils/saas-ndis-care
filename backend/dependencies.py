# backend/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase, supabase_admin
from pydantic import BaseModel, UUID4

security = HTTPBearer()

class CurrentUser(BaseModel):
    id: UUID4
    agency_id: UUID4
    role: str

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    token = credentials.credentials
    
    try:
        # 1. Ask Supabase to verify the token
        user_response = supabase.auth.get_user(token)
        user = user_response.user

        print(f"[DEBUG 2] Supabase validated the token! User ID: {user.id}")

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        # 2. Extract claims from app_metadata
        app_metadata = user.app_metadata or {}
        agency_id = app_metadata.get("agency_id")
        role = app_metadata.get("role")

        # --- PLAN B: EL FALLBACK ---
        # Si el token viene vacío (por haber inyectado los datos a mano), 
        # consultamos la tabla profiles como administrador.
        if not agency_id:
            print("[DEBUG] agency_id missing in token. Fetching directly from DB...")
            profile_response = supabase_admin.table("profiles").select("agency_id, role").eq("id", str(user.id)).execute()
            
            if profile_response.data:
                agency_id = profile_response.data[0].get("agency_id")
                role = profile_response.data[0].get("role", "worker")
                print(f"[DEBUG] Recovered from DB! Agency: {agency_id}")

        # 3. Fail fast if STILL an orphan
        if not agency_id:
            print("[DEBUG ERROR] User genuinely has no agency_id. Blocking access.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to any agency. Access denied.",
            )

        # 4. Return context
        return CurrentUser(
            id=user.id,
            agency_id=agency_id,
            role=role or "worker"
        )

    except Exception as e:
        print(f"[DEBUG ERROR] Exception in get_current_user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )