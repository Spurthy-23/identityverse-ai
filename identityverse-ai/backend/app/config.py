"""
Central configuration for the app.
All values are read from environment variables so the same code works
locally (TinyDB, no API key) and in production (MongoDB Atlas, Gemini key).
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # reads .env in the working directory if present; no-op otherwise

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# --- Database ---
# If MONGO_URI is set, you can swap db.py to use pymongo (see db.py docstring
# for the 5-line change needed). Until then, TinyDB gives identical query
# semantics on a local JSON file -- zero setup, same code shape as Mongo.
MONGO_URI = os.getenv("MONGO_URI", "")
TINYDB_PATH = str(DATA_DIR / "identityverse.json")

# --- Auth ---
AUTH_ENABLED = os.getenv("AUTH_ENABLED", "false").lower() == "true"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"

# --- Groq AI ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# --- CORS ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# --- Synthetic data sizing (matches problem statement) ---
NUM_USERS = int(os.getenv("NUM_USERS", "500"))
NUM_AUDIT_LOGS = int(os.getenv("NUM_AUDIT_LOGS", "10000"))
RANDOM_SEED = int(os.getenv("RANDOM_SEED", "42"))
