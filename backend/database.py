"""
database.py – SQLAlchemy models and database initialisation.
Supports both SQLite (local dev) and PostgreSQL (production on Render).
Extended with SalesRecordDB for CSV uploads and discount/seasonal fields.
Extended with discount timer fields: discount_expires_at, discount_duration_days, discount_type.
Extended with PendingRegistrationDB for OTP-based email verification.
"""

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pathlib import Path
import datetime
import os

BASE_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Database URL — PostgreSQL on Render, SQLite locally
# ---------------------------------------------------------------------------
_raw_db_url = os.environ.get("DATABASE_URL", "")

# Render provides postgres:// but SQLAlchemy requires postgresql://
if _raw_db_url.startswith("postgres://"):
    _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)

if _raw_db_url and "postgresql" in _raw_db_url:
    DATABASE_URL = _raw_db_url
    IS_SQLITE = False
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,       # test connection before using from pool
        pool_recycle=300,          # recycle connections every 5 min
        pool_size=5,
        max_overflow=10,
    )
    print(f"[DB] Using PostgreSQL")
else:
    DATABASE_URL = f"sqlite:///{BASE_DIR / 'supply_chain.db'}"
    IS_SQLITE = True
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print(f"[DB] Using SQLite at {BASE_DIR / 'supply_chain.db'}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class UserDB(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    shopName = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    createdAt = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class PendingRegistrationDB(Base):
    """Stores unverified registrations waiting for OTP email confirmation."""
    __tablename__ = "pending_registrations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    shopName = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(String, nullable=False)   # ISO datetime string
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


class InventoryItemDB(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="", index=True)  # owner of this product
    name = Column(String, nullable=False)
    sku = Column(String, default="")
    category = Column(String, default="Grocery")
    stock = Column(Integer, default=0)
    minStock = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    profit_rate = Column(Float, default=10.0)
    supplier = Column(String, default="")
    image = Column(String, default="📦")
    # Discount fields
    discount_pct = Column(Float, default=0.0)
    discount_reason = Column(String, default="")
    # Discount timer & type fields
    discount_type = Column(String, default="")
    discount_duration_days = Column(Integer, default=0)
    discount_expires_at = Column(String, default="")
    # Seasonal fields
    is_seasonal = Column(Boolean, default=False)
    season_tag = Column(String, default="")


class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, default="", index=True)
    created_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())
    total_amount = Column(Float, default=0.0)
    total_profit = Column(Float, default=0.0)
    item_count = Column(Integer, default=0)
    items = relationship("OrderItemDB", back_populates="order", cascade="all, delete-orphan")


class OrderItemDB(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    profit_rate = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    profit = Column(Float, default=0.0)
    order = relationship("OrderDB", back_populates="items")


class SalesRecordDB(Base):
    """Stores rows uploaded via CSV – used for forecasting & analytics."""
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    date = Column(String, nullable=False)
    product_name = Column(String, nullable=False, index=True)
    category = Column(String, default="Grocery")
    price = Column(Float, default=0.0)
    stock_level = Column(Integer, default=0)
    units_sold = Column(Integer, default=0)
    month = Column(Integer, default=1)
    season = Column(String, default="Winter")
    is_festival = Column(String, default="No")
    discount_pct = Column(Float, default=0.0)
    uploaded_at = Column(String, default=lambda: datetime.datetime.utcnow().isoformat())


# ---------------------------------------------------------------------------
# DB dependency (FastAPI)
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Create tables on startup
# ---------------------------------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)
    # Only run SQLite-specific column migration for local dev
    if IS_SQLITE:
        _add_missing_columns()


def _add_missing_columns():
    """
    Safely add new columns to existing SQLite tables without dropping data.
    This runs only when IS_SQLITE=True (local development).
    PostgreSQL always gets fresh tables from Base.metadata.create_all().
    """
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    with engine.connect() as conn:
        if "inventory" in existing_tables:
            inv_cols = [c["name"] for c in inspector.get_columns("inventory")]
            migrations = [
                ("discount_pct",           "ALTER TABLE inventory ADD COLUMN discount_pct REAL DEFAULT 0.0"),
                ("discount_reason",        "ALTER TABLE inventory ADD COLUMN discount_reason TEXT DEFAULT ''"),
                ("discount_type",          "ALTER TABLE inventory ADD COLUMN discount_type TEXT DEFAULT ''"),
                ("discount_duration_days", "ALTER TABLE inventory ADD COLUMN discount_duration_days INTEGER DEFAULT 0"),
                ("discount_expires_at",    "ALTER TABLE inventory ADD COLUMN discount_expires_at TEXT DEFAULT ''"),
                ("is_seasonal",            "ALTER TABLE inventory ADD COLUMN is_seasonal INTEGER DEFAULT 0"),
                ("season_tag",             "ALTER TABLE inventory ADD COLUMN season_tag TEXT DEFAULT ''"),
                ("user_id",                "ALTER TABLE inventory ADD COLUMN user_id TEXT DEFAULT ''"),
            ]
            for col, sql in migrations:
                if col not in inv_cols:
                    try:
                        conn.execute(text(sql))
                    except Exception as e:
                        print(f"[MIGRATE] {col}: {e}")

        if "orders" in existing_tables:
            ord_cols = [c["name"] for c in inspector.get_columns("orders")]
            if "user_id" not in ord_cols:
                try:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN user_id TEXT DEFAULT ''"))
                except Exception as e:
                    print(f"[MIGRATE] orders.user_id: {e}")

        conn.commit()
