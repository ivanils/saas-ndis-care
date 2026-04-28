# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import supabase

app = FastAPI(title="NDIS Care SaaS API", version="1.0.0")

# Configure CORS to allow communication with the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """
    Basic health check endpoint to verify server status.
    """
    return {
        "status": "online",
        "message": "FastAPI is running successfully",
        "supabase_connection": "configured"
    }