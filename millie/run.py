#!/usr/bin/env python3
"""Start Millie: python3 run.py  ->  http://localhost:8035"""

import uvicorn

from app import create_app

app = create_app()

if __name__ == "__main__":
    print("\n  Millie is answering at http://localhost:8035\n")
    uvicorn.run(app, host="0.0.0.0", port=8035, log_level="warning")
