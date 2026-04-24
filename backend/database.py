from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# .env ගොනුවේ ඇති දත්ත කියවීම සඳහා
load_dotenv()

# =========================
# DATABASE URL
# =========================
# ඔබගේ .env ගොනුවේ DATABASE_URL එක තිබිය යුතුයි (උදා: Supabase හෝ PostgreSQL URL එකක්)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file. Please add it to connect to a real database.")

# =========================
# ENGINE CONFIGURATION
# =========================
# Supabase වැනි Cloud DB භාවිතා කරන විට SSL mode අවශ්‍ය වේ (Roadmap Phase 1 සඳහා වැදගත්)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"}
)

# =========================
# SESSION & BASE
# =========================
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# =========================
# DEPENDENCY (DB ලබා ගැනීම සඳහා)
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()