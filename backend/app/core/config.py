from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_URL = f"sqlite:///{BASE_DIR / 'hr_mvp.db'}"
JWT_SECRET_KEY = "change-me-in-production"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
