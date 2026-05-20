"""
database.py – SQLAlchemy models and database initialisation for SQLite.
Extended with SalesRecordDB for CSV uploads and discount/seasonal fields.
"""

from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pathlib import Path
import datetime

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'supply_chain.db'}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
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
    discount_pct = Column(Float, default=0.0)       # 0, 20, 30, 50, 70
    discount_reason = Column(String, default="")
    # Seasonal fields
    is_seasonal = Column(Boolean, default=False)
    season_tag = Column(String, default="")          # e.g. "Winter", "Summer"


class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, default="", index=True)  # owner of this order
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
# Create tables (safe – adds new columns via recreate)
# ---------------------------------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


def _add_missing_columns():
    """Safely add new columns to existing tables without dropping data."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)

    with engine.connect() as conn:
        inv_cols = [c["name"] for c in inspector.get_columns("inventory")]
        if "discount_pct"    not in inv_cols:
            conn.execute(text("ALTER TABLE inventory ADD COLUMN discount_pct REAL DEFAULT 0.0"))
        if "discount_reason" not in inv_cols:
            conn.execute(text("ALTER TABLE inventory ADD COLUMN discount_reason TEXT DEFAULT ''"))
        if "is_seasonal"     not in inv_cols:
            conn.execute(text("ALTER TABLE inventory ADD COLUMN is_seasonal INTEGER DEFAULT 0"))
        if "season_tag"      not in inv_cols:
            conn.execute(text("ALTER TABLE inventory ADD COLUMN season_tag TEXT DEFAULT ''"))
        if "user_id"         not in inv_cols:
            conn.execute(text("ALTER TABLE inventory ADD COLUMN user_id TEXT DEFAULT ''"))

        ord_cols = [c["name"] for c in inspector.get_columns("orders")]
        if "user_id" not in ord_cols:
            conn.execute(text("ALTER TABLE orders ADD COLUMN user_id TEXT DEFAULT ''"))

        conn.commit()
