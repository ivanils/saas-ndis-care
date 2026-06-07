# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, shifts, care_notes, participants, profiles

app = FastAPI(title="NDIS Care SaaS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://saas-ndis-care-ivanils-projects.vercel.app"
    ], 
    allow_origin_regex=r"https://.*\.vercel\.app",
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

@app.api_route("/ping", methods=["GET", "HEAD"])
def keep_alive():
    return {"status": "awake"}