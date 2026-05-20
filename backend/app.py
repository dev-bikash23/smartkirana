"""
SmartKirana AI Supply Chain Backend
• SQLite database via SQLAlchemy
• QR code generation per product
• Multi-product order scanning with bill generation
• Orders list with profit calculation
• AI stock analysis from inventory DB data (no CSV needed for test)
• GRU neural network for forecasting
"""

import ast, base64, io, json, os, math
from pathlib import Path
from datetime import datetime, timedelta
import time

import numpy as np
import pandas as pd
import qrcode
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

import auth as auth_utils
from database import init_db, get_db, UserDB, InventoryItemDB, OrderDB, OrderItemDB

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR  = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pth"
NORM_PATH  = BASE_DIR / "norm.txt"
CSV_PATH   = BASE_DIR / "synthetic_supply_chain_dataset.csv"
INVENTORY_JSON = BASE_DIR / "inventory_data.json"

# ---------------------------------------------------------------------------
# GRU Model
# ---------------------------------------------------------------------------
class GRUStockModel(nn.Module):
    def __init__(self, input_size=7, hidden_size=64, num_layers=2, dropout=0.1):
        super().__init__()
        self.gru = nn.GRU(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)
        self.fc  = nn.Linear(hidden_size, 7)
    def forward(self, x):
        out, _ = self.gru(x)
        return self.fc(out[:, -1, :])

PRODUCT_ENCODING  = {"Rice": 0, "Bread": 1, "Butter": 2, "Biscuits": 3, "Milk": 4}
SEASON_ENCODING   = {"Winter": 0, "Spring": 1, "Summer": 2, "Autumn": 3}
FESTIVAL_ENCODING = {"No": 0, "Yes": 1}

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="SmartKirana AI Supply Chain API")

# Allow all origins in production; restrict to specific domains for security
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else ["http://localhost:5173", "http://localhost:5174",
          "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
)

app.add_middleware(CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",   # Allow all Vercel preview URLs
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

model: GRUStockModel = None
norm_dict: dict = {}
df: pd.DataFrame = None

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    global model, norm_dict, df
    init_db()

    model = GRUStockModel()
    model.load_state_dict(torch.load(str(MODEL_PATH), map_location="cpu"))
    model.eval()

    with open(NORM_PATH) as f:
        norm_dict = ast.literal_eval(f.read().strip())

    if CSV_PATH.exists():
        df = pd.read_csv(str(CSV_PATH))
        df["Date"] = pd.to_datetime(df["Date"])
    else:
        df = pd.DataFrame()

    print("[OK] SmartKirana backend ready.")


def _migrate_inventory_json():
    if not INVENTORY_JSON.exists():
        return
    db = next(get_db())
    if db.query(InventoryItemDB).count() > 0:
        db.close()
        return
    try:
        with open(INVENTORY_JSON, encoding="utf-8") as f:
            items = json.load(f)
        for item in items:
            if not item.get("name"):
                continue
            db.add(InventoryItemDB(
                id=item.get("id"), name=item.get("name",""),
                sku=item.get("sku",""), category=item.get("category","Grocery"),
                stock=item.get("stock",0), minStock=item.get("minStock",0),
                price=item.get("price",0.0), profit_rate=item.get("profit_rate",10.0),
                supplier=item.get("supplier",""), image=item.get("image","📦"),
            ))
        db.commit()
    except Exception as e:
        print(f"[WARN] Migration: {e}")
    finally:
        db.close()

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    product_name: str
    current_stock: int

class UserCreate(BaseModel):
    name: str; shopName: str; email: str; password: str

class UserResponse(BaseModel):
    id: str; name: str; shopName: str; email: str

class InventoryItemSchema(BaseModel):
    id: Optional[int] = None
    name: str
    sku: str = ""
    category: str = "Grocery"
    stock: int = 0
    minStock: int = 0
    price: float = 0.0
    profit_rate: float = 10.0
    supplier: str = ""
    image: str = "📦"

class AddProductRequest(BaseModel):
    name: str
    price: float
    stock: int
    profit_rate: float
    category: str = "Grocery"
    image: str = "📦"

class StockAdjustment(BaseModel):
    adjustment: int

class ScanPayload(BaseModel):
    product_id: int
    price: float
    stock: int

class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = 1

class CreateOrderRequest(BaseModel):
    items: List[OrderItemIn]

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def get_current_user(token: str = Depends(auth_utils.oauth2_scheme), db: Session = Depends(get_db)):
    payload = auth_utils.decode_access_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"id": str(user.id), "name": user.name, "shopName": user.shopName, "email": user.email}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _normalise(value, col):
    mn, mx = norm_dict[col]
    return (value - mn) / (mx - mn)

def prepare_input(product_rows):
    rows = product_rows.copy()
    rows["Product_Name"] = rows["Product_Name"].map(PRODUCT_ENCODING).astype(np.int64)
    rows["Season"]       = rows["Season"].map(SEASON_ENCODING).astype(np.int64)
    rows["Is_Festival"]  = rows["Is_Festival"].map(FESTIVAL_ENCODING).astype(np.int64)
    for col in ["Price","Stock_Level","Discount(%)"]:
        rows[col] = rows[col].apply(lambda v, c=col: _normalise(v, c))
    rows = rows.drop(columns=["Date","Product_ID","Category","Day_of_Week","Units_Sold"], errors="ignore")
    feature_cols = ["Product_Name","Price","Stock_Level","Month","Season","Is_Festival","Discount(%)"]
    tensor = torch.tensor(rows[feature_cols].values, dtype=torch.float32).unsqueeze(0)
    return tensor

def _generate_qr_b64(product_id, price, stock):
    data = json.dumps({"product_id": product_id, "price": price, "stock": stock})
    qr = qrcode.QRCode(version=1, box_size=8, border=3)
    qr.add_data(data); qr.make(fit=True)
    img = qr.make_image(fill_color="#1a1a2e", back_color="white")
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

def _compute_ai_stock(item: InventoryItemDB):
    """Compute AI stock metrics from inventory DB data (no CSV needed)."""
    avg_daily_sale = max(1, round(item.minStock * 0.7)) if item.minStock > 0 else 5
    safety_stock   = item.minStock if item.minStock > 0 else max(5, avg_daily_sale * 3)
    reorder_point  = safety_stock + avg_daily_sale * 7
    days_remaining = item.stock // avg_daily_sale if avg_daily_sale > 0 else 999

    if item.stock <= 0:
        stock_status = "OUT OF STOCK"
        status_level = "critical"
    elif item.stock < safety_stock:
        stock_status = "LOW STOCK"
        status_level = "low"
    elif item.stock > reorder_point * 2:
        stock_status = "EXCESS STOCK"
        status_level = "excess"
    else:
        stock_status = "ENOUGH STOCK"
        status_level = "ok"

    # Simulate 14-day sales history
    base_sale = avg_daily_sale
    sales_14 = []
    for i in range(14):
        variation = round(base_sale * (0.7 + 0.6 * abs(math.sin(i * 0.8))))
        sales_14.append(max(1, variation))

    # 7-day analysis summary
    week1 = sales_14[:7]
    week2 = sales_14[7:]
    trend = "increasing" if sum(week2) > sum(week1) else "decreasing"

    return {
        "avg_daily_sale": avg_daily_sale,
        "safety_stock": safety_stock,
        "reorder_point": reorder_point,
        "days_remaining": days_remaining,
        "stock_status": stock_status,
        "status_level": status_level,
        "sales_14_days": sales_14,
        "trend_7_days": trend,
        "week1_total": sum(week1),
        "week2_total": sum(week2),
    }

# ===========================================================================
# ENDPOINTS
# ===========================================================================

@app.get("/")
def root():
    return {"message": "SmartKirana AI Supply Chain API is running."}

@app.get("/system/status")
def system_status(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        count = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).count()
        return {"status": "operational", "model_loaded": model is not None,
                "db_connected": True, "inventory_sync": count > 0,
                "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"status": "degraded", "error": str(e), "timestamp": datetime.utcnow().isoformat()}

# --- Auth -------------------------------------------------------------------
@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(UserDB).filter(UserDB.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = UserDB(id=str(int(time.time()*1000)), name=user.name, shopName=user.shopName,
                      email=user.email, hashed_password=auth_utils.get_password_hash(user.password),
                      createdAt=datetime.utcnow().isoformat())
    db.add(new_user); db.commit(); db.refresh(new_user)
    return {"id": new_user.id, "name": new_user.name, "shopName": new_user.shopName, "email": new_user.email}

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password",
                            headers={"WWW-Authenticate": "Bearer"})
    token = auth_utils.create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "name": user.name, "shopName": user.shopName, "email": user.email}}

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# --- Dataset / Forecasting --------------------------------------------------

@app.get("/products")
def get_products():
    if df is not None and not df.empty:
        return {"products": df["Product_Name"].unique().tolist()}
    return {"products": []}

@app.get("/dataset-summary")
def dataset_summary(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).all()
    total_stock = sum(i.stock for i in items)
    avg_price   = round(sum(i.price for i in items) / len(items), 1) if items else 0
    if df is not None and not df.empty:
        return {"total_records": int(len(df)),
                "date_range": {"start": str(df["Date"].min().date()), "end": str(df["Date"].max().date())},
                "products": df["Product_Name"].unique().tolist(),
                "avg_units_sold": round(float(df["Units_Sold"].mean()), 1),
                "avg_price": round(float(df["Price"].mean()), 1)}
    return {"total_records": total_stock, "date_range": {"start": "N/A", "end": "N/A"},
            "products": [i.name for i in items], "avg_units_sold": 0, "avg_price": avg_price}

@app.post("/predict")
def predict(req: PredictRequest):
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="No dataset loaded for forecasting.")
    product_df = df[df["Product_Name"] == req.product_name].sort_values("Date")
    if len(product_df) < 14:
        raise HTTPException(status_code=400, detail=f"Not enough data for '{req.product_name}'.")
    last_14 = product_df.tail(14).reset_index(drop=True)
    input_tensor = prepare_input(last_14)
    with torch.no_grad():
        raw_pred = model(input_tensor).squeeze(0)
    us_min, us_max = norm_dict["Units_Sold"]
    forecast = [round(float(v*(us_max-us_min)+us_min)) for v in raw_pred]
    avg_demand    = round(sum(forecast)/len(forecast))
    safety_stock  = max(forecast)
    reorder_point = avg_demand + safety_stock
    remaining = req.current_stock
    stockout_day = None
    for i, d in enumerate(forecast):
        remaining -= d
        if remaining < 0:
            stockout_day = i+1; break
    if stockout_day:
        alert, msg = True, f"🚨 CRITICAL: Stockout predicted in {stockout_day} days!"
    elif req.current_stock < reorder_point:
        alert, msg = True, f"⚠️ Stock is LOW! Reorder immediately. Reorder point: {reorder_point} units."
    else:
        alert, msg = False, f"✅ Stock levels sufficient. Reorder point: {reorder_point} units."
    return {"product": req.product_name, "current_stock": req.current_stock,
            "forecast_7_days": forecast, "avg_demand": avg_demand,
            "safety_stock": safety_stock, "reorder_point": reorder_point,
            "alert": alert, "alert_message": msg}

@app.get("/history/{product_name}")
def history(product_name: str):
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No dataset available.")
    product_df = df[df["Product_Name"] == product_name].sort_values("Date")
    if product_df.empty:
        raise HTTPException(status_code=404, detail=f"Product '{product_name}' not found.")
    last_30 = product_df.tail(30).reset_index(drop=True)
    return {"product": product_name, "dates": [str(d.date()) for d in last_30["Date"]],
            "units_sold": last_30["Units_Sold"].tolist()}

@app.get("/history/db/{product_id}")
def history_db(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return 7-day FUTURE sales forecast with real calendar dates for any DB product."""
    item = db.query(InventoryItemDB).filter(
        InventoryItemDB.id == product_id,
        InventoryItemDB.user_id == current_user["id"]
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")

    # Future dates: tomorrow → 7 days ahead
    today = datetime.utcnow().date()
    future_dates = [(today + timedelta(days=i + 1)) for i in range(7)]

    # --- Use GRU model for the 5 CSV-trained products ---
    if item.name in PRODUCT_ENCODING and df is not None and not df.empty:
        product_df = df[df["Product_Name"] == item.name].sort_values("Date")
        if len(product_df) >= 14:
            last_14 = product_df.tail(14).reset_index(drop=True)
            input_tensor = prepare_input(last_14)
            with torch.no_grad():
                raw_pred = model(input_tensor).squeeze(0)
            us_min, us_max = norm_dict["Units_Sold"]
            forecast = [max(1, round(float(v * (us_max - us_min) + us_min))) for v in raw_pred]
            return {
                "product": item.name,
                "product_id": item.id,
                "dates": [str(d) for d in future_dates],
                "units_sold": forecast[:7],
                "source": "gru_model"
            }

    # --- Simulated 7-day forecast for all other DB products ---
    min_s = item.minStock if item.minStock > 0 else 5
    base_daily = max(1, round(min_s * 0.5))
    rng = abs(hash(item.name)) % 1000  # deterministic per product

    units_sold = []
    for i, d in enumerate(future_dates):
        dow_factor = 1.3 if d.weekday() >= 5 else 1.0
        wave = 1.0 + 0.4 * math.sin((i + rng) * 0.7)
        noise = ((hash(str(d) + item.name) % 20) - 10) / 100.0
        val = max(1, round(base_daily * dow_factor * wave * (1 + noise)))
        units_sold.append(val)

    return {
        "product": item.name,
        "product_id": item.id,
        "dates": [str(d) for d in future_dates],
        "units_sold": units_sold,
        "source": "ai_forecast"
    }

# --- Inventory CRUD ---------------------------------------------------------
@app.get("/inventory")
def get_inventory(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).all()
    products = [{"id": it.id, "name": it.name, "sku": it.sku, "category": it.category,
                 "stock": it.stock, "minStock": it.minStock, "price": it.price,
                 "profit_rate": getattr(it, "profit_rate", 10.0),
                 "supplier": it.supplier, "image": it.image,
                 "discount_pct": getattr(it, "discount_pct", 0.0) or 0.0,
                 "discount_reason": getattr(it, "discount_reason", "") or ""} for it in items]
    return {"products": products, "total_items": len(products),
            "low_stock_count": sum(1 for p in products if p["stock"] < p["minStock"])}

@app.get("/inventory/categories")
def get_inventory_categories(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).all()
    top_selling, low_selling, dead_stock = [], [], []
    for it in items:
        prod = {"id": it.id, "name": it.name, "category": it.category,
                "stock": it.stock, "minStock": it.minStock, "price": it.price, "image": it.image}
        if it.stock >= it.minStock*3 and it.stock > 50:
            dead_stock.append(prod)
        elif it.stock <= it.minStock+10:
            top_selling.append(prod)
        else:
            low_selling.append(prod)
    top_selling.sort(key=lambda x: x["stock"])
    dead_stock.sort(key=lambda x: x["stock"], reverse=True)
    return {"top_selling": top_selling[:5], "low_selling": low_selling[:5], "dead_stock": dead_stock[:5]}

@app.get("/inventory/{product_id}")
def get_inventory_item(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    return {"id": item.id, "name": item.name, "sku": item.sku, "category": item.category,
            "stock": item.stock, "minStock": item.minStock, "price": item.price,
            "profit_rate": getattr(item, "profit_rate", 10.0),
            "supplier": item.supplier, "image": item.image,
            "discount_pct": getattr(item, "discount_pct", 0.0) or 0.0,
            "discount_reason": getattr(item, "discount_reason", "") or ""}

@app.post("/inventory/add-product")
def add_product_simple(req: AddProductRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Simplified add-product endpoint: name, price, stock, profit_rate."""
    new_id = int(time.time() * 1000) % 2147483647
    sku = req.name.upper().replace(" ", "")[:6] + str(new_id)[-4:]
    db_item = InventoryItemDB(
        id=new_id, user_id=current_user["id"],
        name=req.name, sku=sku, category=req.category,
        stock=req.stock, minStock=max(5, req.stock//10),
        price=req.price, profit_rate=req.profit_rate,
        supplier="", image=req.image,
    )
    db.add(db_item); db.commit(); db.refresh(db_item)
    return {"message": "Product added successfully", "id": db_item.id,
            "name": db_item.name, "sku": db_item.sku}

@app.post("/inventory")
def add_inventory_item(item: InventoryItemSchema, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    new_id = item.id if item.id else int(time.time()*1000) % 2147483647
    db_item = InventoryItemDB(id=new_id, user_id=current_user["id"],
                               name=item.name, sku=item.sku, category=item.category,
                               stock=item.stock, minStock=item.minStock, price=item.price,
                               profit_rate=item.profit_rate, supplier=item.supplier, image=item.image)
    db.add(db_item); db.commit(); db.refresh(db_item)
    return {"message": "Item added successfully", "item": {"id": db_item.id, "name": db_item.name}}

@app.put("/inventory/{product_id}")
def update_inventory_item(product_id: int, item: InventoryItemSchema, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db_item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    db_item.name=item.name; db_item.sku=item.sku; db_item.category=item.category
    db_item.stock=item.stock; db_item.minStock=item.minStock; db_item.price=item.price
    db_item.profit_rate=item.profit_rate; db_item.supplier=item.supplier; db_item.image=item.image
    db.commit()
    return {"message": "Item updated successfully"}

@app.delete("/inventory/all")
def delete_all_inventory(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete ALL products belonging to the current user."""
    deleted = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {deleted} products successfully."}

@app.delete("/inventory/{product_id}")
def delete_inventory_item(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db_item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    db.delete(db_item); db.commit()
    return {"message": "Item deleted successfully"}

@app.post("/inventory/{product_id}/adjust")
def adjust_stock(product_id: int, body: StockAdjustment, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db_item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    db_item.stock = max(0, db_item.stock + body.adjustment)
    db.commit()
    return {"message": "Stock adjusted", "new_stock": db_item.stock}


class SetDiscountRequest(BaseModel):
    discount_pct: float
    reason: str = ""

@app.post("/inventory/{product_id}/discount")
def set_discount(product_id: int, body: SetDiscountRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Manually set a discount on a specific product."""
    db_item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    if body.discount_pct < 0 or body.discount_pct > 90:
        raise HTTPException(status_code=400, detail="Discount must be between 0 and 90%.")
    db_item.discount_pct = body.discount_pct
    db_item.discount_reason = body.reason or f"Manual discount — {body.discount_pct}% off"
    db.commit()
    discounted_price = round(db_item.price * (1 - body.discount_pct / 100), 2)
    return {"message": f"Discount of {body.discount_pct}% applied to '{db_item.name}'",
            "product_id": db_item.id, "name": db_item.name,
            "original_price": db_item.price, "discounted_price": discounted_price}

@app.post("/inventory/{product_id}/remove-discount")
def remove_discount(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove discount from a specific product."""
    db_item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not db_item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    db_item.discount_pct = 0.0
    db_item.discount_reason = ""
    db.commit()
    return {"message": f"Discount removed from '{db_item.name}'", "product_id": db_item.id}

# --- QR Endpoints -----------------------------------------------------------
@app.get("/inventory/{product_id}/qr")
def get_product_qr(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    return {"product_id": item.id, "product_name": item.name, "price": item.price,
            "stock": item.stock, "qr_base64": _generate_qr_b64(item.id, item.price, item.stock)}

@app.post("/inventory/scan")
def scan_product(payload: ScanPayload, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Scan one product – decrement stock by 1, return product info for cart.
    Price returned is the MRP (GST-inclusive). discount_pct reflects any active vendor discount.
    The discounted_price is what the customer actually pays.
    """
    item = db.query(InventoryItemDB).filter(InventoryItemDB.id == payload.product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Product {payload.product_id} not found.")
    if item.stock <= 0:
        raise HTTPException(status_code=400, detail="Stock is already 0.")
    item.stock -= 1
    db.commit(); db.refresh(item)
    discount_pct = getattr(item, "discount_pct", 0.0) or 0.0
    discounted_price = round(item.price * (1 - discount_pct / 100), 2)
    return {"message": f"Stock decremented for '{item.name}'",
            "product_id": item.id, "product_name": item.name,
            "new_stock": item.stock,
            "mrp": item.price,                  # Original MRP (GST-inclusive)
            "price": discounted_price,           # Actual selling price (after discount)
            "discount_pct": discount_pct,
            "profit_rate": getattr(item, "profit_rate", 10.0)}

# --- Orders -----------------------------------------------------------------
@app.post("/orders")
def create_order(req: CreateOrderRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create an order from a list of {product_id, quantity} and decrement stock."""
    order_items_data = []
    total_amount = 0.0
    total_profit = 0.0
    for entry in req.items:
        item = db.query(InventoryItemDB).filter(InventoryItemDB.id == entry.product_id, InventoryItemDB.user_id == current_user["id"]).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Product {entry.product_id} not found.")
        if item.stock < entry.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{item.name}'.")
        subtotal = item.price * entry.quantity
        profit_rate = getattr(item, "profit_rate", 10.0)
        profit = round(subtotal * profit_rate / 100, 2)
        order_items_data.append({"item": item, "quantity": entry.quantity,
                                  "subtotal": subtotal, "profit": profit, "profit_rate": profit_rate})
        total_amount += subtotal
        total_profit += profit

    order = OrderDB(user_id=current_user["id"],
                    created_at=datetime.utcnow().isoformat(),
                    total_amount=round(total_amount, 2),
                    total_profit=round(total_profit, 2),
                    item_count=len(req.items))
    db.add(order); db.flush()

    for od in order_items_data:
        it = od["item"]
        db.add(OrderItemDB(order_id=order.id, product_id=it.id, product_name=it.name,
                            quantity=od["quantity"], unit_price=it.price,
                            profit_rate=od["profit_rate"],
                            subtotal=od["subtotal"], profit=od["profit"]))
        it.stock = max(0, it.stock - od["quantity"])

    db.commit(); db.refresh(order)
    return {"message": "Order created", "order_id": order.id,
            "total_amount": order.total_amount, "total_profit": order.total_profit}

@app.get("/orders")
def list_orders(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(OrderDB).filter(OrderDB.user_id == current_user["id"]).order_by(OrderDB.id.desc()).all()
    result = []
    for o in orders:
        items = [{"product_id": oi.product_id, "product_name": oi.product_name,
                  "quantity": oi.quantity, "unit_price": oi.unit_price,
                  "subtotal": oi.subtotal, "profit": oi.profit} for oi in o.items]
        result.append({"id": o.id, "created_at": o.created_at, "total_amount": o.total_amount,
                        "total_profit": o.total_profit, "item_count": o.item_count, "items": items})
    return {"orders": result, "total_orders": len(result)}

@app.get("/orders/{order_id}")
def get_order(order_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(OrderDB).filter(OrderDB.id == order_id, OrderDB.user_id == current_user["id"]).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found.")
    items = [{"product_id": oi.product_id, "product_name": oi.product_name,
              "quantity": oi.quantity, "unit_price": oi.unit_price,
              "subtotal": oi.subtotal, "profit": oi.profit} for oi in order.items]
    return {"id": order.id, "created_at": order.created_at, "total_amount": order.total_amount,
            "total_profit": order.total_profit, "item_count": order.item_count, "items": items}

# --- AI Stock Test ----------------------------------------------------------
@app.get("/ai-stock-test/{product_id}")
def ai_stock_test(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """AI stock analysis using inventory DB data. No CSV needed."""
    item = db.query(InventoryItemDB).filter(InventoryItemDB.id == product_id, InventoryItemDB.user_id == current_user["id"]).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found.")
    metrics = _compute_ai_stock(item)
    return {"product_id": item.id, "product_name": item.name, "current_stock": item.stock,
            "price": item.price, "category": item.category, **metrics}

@app.get("/inventory-list")
def inventory_list(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lightweight list for dropdowns."""
    items = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).all()
    return [{"id": it.id, "name": it.name, "category": it.category,
             "stock": it.stock, "image": it.image} for it in items]

# --- CSV Upload (Inventory bulk import) ------------------------------------
import csv
from fastapi import File, UploadFile

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    contents = await file.read()
    decoded = contents.decode("utf-8").splitlines()
    reader = csv.DictReader(decoded)
    added_count = 0
    for row in reader:
        name = row.get("name", "").strip()
        if not name:
            continue
        try:
            price       = float(row.get("price", 0))
            stock       = int(row.get("stock", 0))
            profit_rate = float(row.get("profit_rate", 10))
            category    = row.get("category", "Grocery").strip()
            min_stock   = int(row.get("min_stock", max(5, stock // 10)))
        except ValueError:
            continue
        new_id = int(time.time() * 1000) % 2147483647
        sku = name.upper().replace(" ", "")[:6] + str(new_id)[-4:]
        db.add(InventoryItemDB(
            id=new_id, user_id=current_user["id"],
            name=name, sku=sku, category=category,
            stock=stock, minStock=min_stock,
            price=price, profit_rate=profit_rate,
            supplier="", image="📦"
        ))
        added_count += 1
        time.sleep(0.001)
    db.commit()
    return {"message": f"Successfully uploaded {added_count} products from CSV."}

# --- Auth Logout (stateless JWT – just a stub) -----------------------------
@app.post("/auth/logout")
def logout():
    return {"message": "Logged out successfully"}

# --- Trending / Deals -------------------------------------------------------
@app.get("/trending")
def get_trending(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return AI-computed trending data from current user's inventory."""
    items = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).all()

    discounted, top_selling, dead_stock = [], [], []

    for it in items:
        reorder_point = (it.minStock if it.minStock > 0 else 5) + max(1, round((it.minStock or 5) * 0.7)) * 7

        if getattr(it, "discount_pct", 0) and it.discount_pct > 0:
            discounted.append({
                "name": it.name, "sku": it.sku, "category": it.category,
                "stock": it.stock, "price": it.price, "image": it.image,
                "discount_pct": it.discount_pct,
                "reason": getattr(it, "discount_reason", "") or "High stock / low demand",
            })

        if it.stock <= (it.minStock or 5) + 10:
            top_selling.append({"name": it.name, "stock": it.stock, "category": it.category})

        if it.stock >= (it.minStock or 5) * 3 and it.stock > 50:
            dead_stock.append({
                "name": it.name, "stock": it.stock, "category": it.category,
                "discount": getattr(it, "discount_pct", 0) or 0,
            })

    top_selling.sort(key=lambda x: x["stock"])
    dead_stock.sort(key=lambda x: x["stock"], reverse=True)

    n_disc = len(discounted)
    n_dead = len(dead_stock)
    if n_dead > 10:
        insight = f"🚨 {n_dead} products have excess stock — apply discounts to clear inventory."
    elif n_disc > 0:
        insight = f"🏷️ {n_disc} active deals running. Monitor stock clearance progress."
    else:
        insight = "✅ Inventory is balanced. No urgent action needed."

    return {
        "discounted_products": discounted[:20],
        "top_selling": top_selling[:10],
        "dead_stock": dead_stock[:10],
        "ai_insight": insight,
        "total_discounted": n_disc,
        "total_dead_stock": n_dead,
    }

@app.post("/apply-discounts")
def apply_discounts(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """AI-powered auto-discount: analyze current user's inventory and apply tiered discounts."""
    items = db.query(InventoryItemDB).filter(InventoryItemDB.user_id == current_user["id"]).all()
    applied_to = []

    for it in items:
        min_s = it.minStock if it.minStock > 0 else 5
        ratio = it.stock / min_s if min_s > 0 else 0

        if it.stock <= 0:
            # Clear any existing discount for out-of-stock
            it.discount_pct = 0.0
            it.discount_reason = ""
            continue

        if ratio >= 10:
            pct = 70.0
            reason = "Severe overstock — clearance pricing"
        elif ratio >= 6:
            pct = 50.0
            reason = "High overstock — heavy discount applied"
        elif ratio >= 3 and it.stock > 50:
            pct = 30.0
            reason = "Moderate overstock — promotional discount"
        else:
            # Well-stocked or low-stock — no discount
            it.discount_pct = 0.0
            it.discount_reason = ""
            continue

        it.discount_pct = pct
        it.discount_reason = reason
        applied_to.append({"name": it.name, "discount_pct": pct, "reason": reason})

    db.commit()
    return {
        "message": f"AI discounts applied to {len(applied_to)} products.",
        "applied_to": applied_to,
    }