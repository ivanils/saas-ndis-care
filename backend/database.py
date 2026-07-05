# backend/database.py
import os

from dotenv import load_dotenv
from supabase import Client, create_client

# Load environment variables from the .env file
load_dotenv()

API_URL = os.getenv("SUPABASE_URL")
API_KEY = os.getenv("SUPABASE_KEY")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Fail fast if credentials are missing
if not API_URL or not API_KEY or not SERVICE_KEY:
    raise ValueError("Missing Supabase credentials in .env file")

# Initialize the Supabase STANDARD client
supabase: Client = create_client(API_URL, API_KEY)

# Initialize the Supabase ADMIN client
supabase_admin: Client = create_client(API_URL, SERVICE_KEY)
