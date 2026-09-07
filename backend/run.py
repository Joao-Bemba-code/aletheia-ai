import uvicorn
from config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
        ws_ping_interval=settings.WS_HEARTBEAT_INTERVAL,
        ws_max_size=16 * 1024 * 1024,
    )
