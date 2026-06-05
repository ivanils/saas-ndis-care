# backend/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, shifts, care_notes, participants, profiles

# Import our database and security tools
from database import supabase
from dependencies import get_current_user, CurrentUser

app = FastAPI(title="NDIS Care SaaS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://saas-ndis-care.vercel.app/"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(shifts.router)
app.include_router(care_notes.router)
app.include_router(participants.router)
app.include_router(profiles.router)

@app.get("/health")
def health_check():
    return {"status": "online", "message": "FastAPI is running successfully"}

# --- NEW SECURE TEST ENDPOINT ---
@app.get("/secure-test")
def secure_test_endpoint(current_user: CurrentUser = Depends(get_current_user)):
    """
    This endpoint is protected. You can only enter if you have a valid badge (CurrentUser).
    """
    return {
        "message": "Welcome to the VIP area!",
        "your_badge": current_user
    }