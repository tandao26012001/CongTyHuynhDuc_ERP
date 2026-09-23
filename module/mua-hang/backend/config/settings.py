import os
from pathlib import Path
from dotenv import load_dotenv

# Mot .env dung chung tai goc repo, khong phu thuoc thu muc khi chay lenh.
REPO_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(REPO_ROOT / ".env")

APP_NAME = "He thong Mua hang & Gia cong ngoai"
API_PREFIX = "/api/v1"
DEFAULT_PORT = 8010

TZ = "Asia/Ho_Chi_Minh"

# DB: Supabase/PostgreSQL via psycopg connection string.
# Dev points to Supabase; production swaps DATABASE_URL without code change.
DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_SCHEMA = os.getenv("DB_SCHEMA", "mua_hang")
DB_CONNECT_TIMEOUT_SECONDS = int(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "5"))
DB_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "15000"))

# Auth
PHIEN_HEADER = "X-Phien"
BCRYPT_ROUNDS = 12
PBKDF2_LEGACY_ROUNDS = int(os.getenv("PBKDF2_LEGACY_ROUNDS", "100000"))

# Paging
PAGE_SIZE_DEFAULT = 50
PAGE_SIZE_MAX = 100
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))

# Response envelope keys — §3.2
# ok, data, error, ma_loi
