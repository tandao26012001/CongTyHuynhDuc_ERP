import os
from dotenv import load_dotenv

load_dotenv()  # nap .env o goc du an (DATABASE_URL...)

APP_NAME = "He thong Mua hang & Gia cong ngoai"
API_PREFIX = "/api/v1"
DEFAULT_PORT = 8010

TZ = "Asia/Ho_Chi_Minh"

# DB: Supabase/PostgreSQL via psycopg connection string.
# Dev points to Supabase; production swaps DATABASE_URL without code change.
DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_SCHEMA = os.getenv("DB_SCHEMA", "mua_hang")

# Auth
PHIEN_HEADER = "X-Phien"
BCRYPT_ROUNDS = 12

# Paging
PAGE_SIZE_DEFAULT = 50
PAGE_SIZE_MAX = 100
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))

# Response envelope keys — §3.2
# ok, data, error, ma_loi
