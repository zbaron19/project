import os

from fastapi import FastAPI
from fastapi.responses import FileResponse

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")


def create_app() -> FastAPI:
    from . import routes, telephony, seed

    app = FastAPI(title="Millie", docs_url=None, redoc_url=None)
    app.include_router(routes.router)
    app.include_router(telephony.router)

    @app.on_event("startup")
    def _seed():
        seed.seed_if_empty()

    @app.get("/")
    def index():
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

    return app
