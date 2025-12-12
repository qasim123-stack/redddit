"""Database connection and session management with SQLModel"""

from sqlmodel import create_engine, Session, SQLModel
from app.core.config import settings

# Create SQLModel engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG
)


def get_db():
    """
    Dependency for getting database session
    Usage in FastAPI: db: Session = Depends(get_db)
    """
    with Session(engine) as session:
        yield session


def init_db():
    """Initialize database - create all tables"""
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created successfully!")


def drop_db():
    """Drop all database tables - USE WITH CAUTION"""
    SQLModel.metadata.drop_all(engine)
    print("⚠️  Database tables dropped!")
