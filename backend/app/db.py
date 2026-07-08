import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/kanban.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False)


def init_db() -> None:
    """Create the database file (if file-based) and tables if they don't exist."""
    if DATABASE_URL.startswith("sqlite:///") and ":memory:" not in DATABASE_URL:
        db_path = DATABASE_URL[len("sqlite:///") :]
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
