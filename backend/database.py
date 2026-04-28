# backend/database.py
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from the .env file
load_dotenv()

API_URL = os.getenv("SUPABASE_URL")
API_KEY = os.getenv("SUPABASE_KEY")

# Fail fast if credentials are missing
if not API_URL or not API_KEY:
    raise ValueError("Missing Supabase credentials in .env file")

# Initialize the Supabase client
supabase: Client = create_client(API_URL, API_KEY)