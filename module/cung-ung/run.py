import uvicorn
from backend.config.settings import DEFAULT_PORT

if __name__ == "__main__":
    uvicorn.run("backend.api.app:app", host="0.0.0.0", port=DEFAULT_PORT, reload=True)
