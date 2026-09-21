import os

import uvicorn
from backend.config.settings import DEFAULT_PORT

if __name__ == "__main__":
    reload_enabled = os.getenv("DEV_RELOAD", "").lower() in {"1", "true", "yes"}
    uvicorn.run(
        "backend.api.app:app",
        host="0.0.0.0",
        port=DEFAULT_PORT,
        reload=reload_enabled,
    )
