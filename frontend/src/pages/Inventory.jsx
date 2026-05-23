import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function AIModal({ product, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get(`${API}/ai-stock-test/${product.id}`)
      .then(r => setData(r.data)).catch(() => {})
      .finally(() => setLoading(false));
  }, [product.id]);
  const levelColor = { critical: "#EF4444", low: "#F97316", excess: "#A855F7", ok: "#22C55E" };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="glass-panel-strong w-full max-w-md p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-[#1E293B]">AI Analysis — {product.name}</h3>
          <button onClick={onClose} className="text-2xl text-[#94A3B8] hover:text-[#1E293B]">✕</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: levelColor[data.status_level] || "#94A3B8" }}>{data.stock_status}</span>
              <span className="text-xs text-[#94A3B8]">Trend: <b className={data.trend_7_days === "increasing" ? "text-green-600" : "text-red-500"}>{data.trend_7_days}</b></span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Avg Daily Sale", data.avg_daily_sale],
                ["Safety Stock", data.safety_stock],
                ["Reorder Point", data.reorder_point],
                ["Days Remaining", data.days_remaining],
                ["Week 1 Sales", data.week1_total],
                ["Week 2 Sales", data.week2_total],
              ].map(([l, v], i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: "#F8FAFC", border: "1px solid #E8EDFF" }}>
                  <p className="text-[10px] text-[#94A3B8] uppercase font-semibold">{l}</p>
                  <p className="text-lg font-bold text-[#1E293B]">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3" style={{ background: "#F8FAFC", border: "1px solid #E8EDFF" }}>
              <p className="text-[10px] text-[#94A3B8] uppercase font-semibold mb-1">14-Day Sales Trend</p>
              <div className="flex items-end gap-0.5 h-12">
                {(data.sales_14_days || []).map((v, i) => (
                  <div key={i} className="flex-1 rounded-sm transition-all" style={{ height: `${Math.max(8, (v / Math.max(...(data.sales_14_days || [1]))) * 100)}%`, background: i >= 7 ? "#4F7CFF" : "#CBD5E1" }} title={`Day ${i+1}: ${v}`} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-[#94A3B8] mt-1"><span>Week 1</span><span>Week 2</span></div>
            </div>
          </div>
        ) : <p className="text-center text-[#94A3B8] py-8">Could not load AI analysis.</p>}
      </div>
    </div>
  );
}

const CATEGORIES = ["All", "Grocery", "Dairy", "Grains", "Oils", "Spices", "Snacks", "Beverages", "Household", "Personal", "Condiments", "Other"];

const CATEGORY_COLORS = {
  Dairy:      { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  Grains:     { bg: "#FEF9C3", border: "#FDE68A", text: "#92400E" },
  Oils:       { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C" },
  Spices:     { bg: "#FFF1F2", border: "#FECDD3", text: "#BE123C" },
  Snacks:     { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  Beverages:  { bg: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9" },
  Household:  { bg: "#E0F2FE", border: "#BAE6FD", text: "#0369A1" },
  Personal:   { bg: "#FDF4FF", border: "#E9D5FF", text: "#7E22CE" },
  Condiments: { bg: "#FFF8F1", border: "#FDDCB5", text: "#B45309" },
  Grocery:    { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
  Other:      { bg: "#F8FAFC", border: "#CBD5E1", text: "#475569" },
};

function getCatStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Other"];
}

function StockBar({ stock, minStock }) {
  const ratio = minStock > 0 ? stock / (minStock * 4) : stock / 200;
  const pct = Math.min(100, Math.round(ratio * 100));
  const color = stock <= 0 ? "#EF4444" : stock < minStock ? "#F97316" : stock > minStock * 3 ? "#A855F7" : "#22C55E";
  return (
    <div className="w-full h-1.5 rounded-full bg-[#E8EDFF] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function QRModal({ product, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/inventory/${product.id}/qr`)
      .then(r => setQrData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [product.id]);

  const handlePrint = () => {
    if (!qrData) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Label — ${product.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
          .label { width: 280px; padding: 24px; text-align: center; border: 2px dashed #ccc; border-radius: 16px; }
          .label h2 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
          .label .sku { font-size: 11px; color: #888; font-family: monospace; margin-bottom: 16px; }
          .label img { width: 200px; height: 200px; margin: 0 auto 16px; display: block; }
          .label .price { font-size: 22px; font-weight: 900; color: #1a1a2e; margin-bottom: 4px; }
          .label .stock { font-size: 11px; color: #888; }
          .label .brand { font-size: 9px; color: #aaa; margin-top: 12px; letter-spacing: 1px; text-transform: uppercase; }
          @media print {
            body { margin: 0; }
            .label { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <h2>${product.name}</h2>
          <p class="sku">SKU: ${product.sku || "N/A"}</p>
          <img src="data:image/png;base64,${qrData.qr_base64}" alt="QR Code" />
          <p class="price">₹${qrData.price}</p>
          <p class="stock">Stock: ${qrData.stock} units</p>
          <p class="brand">SmartKirana</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="glass-panel-strong w-full max-w-sm p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-[#1E293B] text-lg">{product.name}</h3>
            <p className="text-xs text-[#94A3B8] font-mono">SKU: {product.sku || "N/A"}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-[#94A3B8] hover:text-[#1E293B]">✕</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
          </div>
        ) : qrData ? (
          <div className="text-center">
            <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="QR Code" className="w-48 h-48 mx-auto rounded-2xl border border-[#E8EDFF] shadow-md" />
            <p className="mt-4 text-sm text-[#475569]">Price: <strong>₹{qrData.price}</strong> · Stock: <strong>{qrData.stock}</strong></p>
            <p className="text-xs text-[#94A3B8] mt-1">Scan to add to cart</p>
            <button
              onClick={handlePrint}
              className="mt-5 w-full py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white hover:shadow-lg hover:shadow-purple-200 transition-all flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print QR Label
            </button>
          </div>
        ) : (
          <p className="text-center text-[#94A3B8] py-8">Could not load QR code.</p>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onDelete, onAdjust, onQR, onDiscount, onAI }) {
  const [adjusting, setAdjusting] = useState(false);
  const [adjVal, setAdjVal]       = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discVal, setDiscVal] = useState(product.discount_pct || 0);
  const cat = getCatStyle(product.category);
  const isLow    = product.stock < product.minStock;
  const isOut    = product.stock <= 0;
  const isExcess = product.stock > product.minStock * 3 && product.stock > 50;
  const initial = product.name?.charAt(0)?.toUpperCase() || "?";

  const handleAdj = async () => {
    const n = parseInt(adjVal);
    if (isNaN(n) || n === 0) return;
    await onAdjust(product.id, n);
    setAdjusting(false); setAdjVal("");
  };

  const handleRefill = async () => {
    const target = Math.max(product.minStock * 3, 30);
    const needed = target - product.stock;
    if (needed <= 0) return;
    await onAdjust(product.id, needed);
  };

  const handleSetDiscount = async () => {
    await onDiscount(product.id, discVal);
    setShowDiscount(false);
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
      {product.discount_pct > 0 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: "#E11D48" }}>
          {product.discount_pct}% OFF
        </div>
      )}

      {/* Header — category initial instead of emoji */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black flex-shrink-0 shadow-sm"
          style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[#1E293B] truncate leading-tight">{product.name}</p>
          <p className="text-[10px] font-mono text-[#94A3B8] mt-0.5">SKU: {product.sku || "N/A"}</p>
        </div>
      </div>

      {/* Category + Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
          {product.category}
        </span>
        {isOut && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">Out of Stock</span>}
        {!isOut && isLow && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">Low Stock</span>}
        {!isOut && !isLow && isExcess && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-200">Excess</span>}
      </div>

      {/* Stock Bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-[#94A3B8]">Stock</span>
          <span className={`text-sm font-bold ${isOut ? "text-red-500" : isLow ? "text-orange-500" : "text-[#22C55E]"}`}>{product.stock}</span>
        </div>
        <StockBar stock={product.stock} minStock={product.minStock} />
        <p className="text-[10px] text-[#94A3B8] mt-1">Min: {product.minStock}</p>
      </div>

      {/* Price + Profit */}
      <div className="flex justify-between items-center pt-1 border-t border-[#E8EDFF]">
        <div>
          <p className="text-xs text-[#94A3B8]">Price</p>
          {product.discount_pct > 0 ? (
            <div>
              <p className="text-xs text-[#94A3B8] line-through">₹{product.price}</p>
              <p className="text-base font-bold text-[#E11D48]">₹{(product.price * (1 - product.discount_pct / 100)).toFixed(0)}</p>
            </div>
          ) : (
            <p className="text-base font-bold text-[#4F7CFF]">₹{product.price}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[#94A3B8]">Profit Rate</p>
          <p className="text-sm font-bold text-[#22C55E]">{product.profit_rate}%</p>
        </div>
      </div>

      {/* Manual Discount Panel */}
      {showDiscount && (
        <div className="rounded-2xl p-3 space-y-2" style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#C2410C]">Set Discount</span>
            <span className="text-sm font-black text-[#C2410C]">{discVal}%</span>
          </div>
          <input type="range" min="0" max="90" value={discVal} onChange={e => setDiscVal(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-orange-200 dark:bg-slate-700 focus:outline-none" style={{ accentColor: "#E11D48" }} />
          <div className="flex gap-2">
            <button onClick={handleSetDiscount} className="flex-1 py-1.5 text-xs rounded-xl font-bold bg-[#E11D48] text-white hover:bg-[#BE123C] transition-all">
              Apply {discVal}%
            </button>
            {product.discount_pct > 0 && (
              <button onClick={() => { onDiscount(product.id, 0); setShowDiscount(false); }}
                className="px-3 py-1.5 text-xs rounded-xl font-bold bg-white text-[#475569] border border-[#E8EDFF] hover:bg-[#F8FAFC] transition-all">
                Remove
              </button>
            )}
            <button onClick={() => setShowDiscount(false)}
              className="px-3 py-1.5 text-xs rounded-xl font-bold bg-white text-[#475569] border border-[#E8EDFF] hover:bg-[#F8FAFC] transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {confirmDel ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-center space-y-2">
          <p className="text-xs font-semibold text-red-600">Delete "{product.name}"?</p>
          <div className="flex gap-2">
            <button onClick={() => { onDelete(product.id, product.name); setConfirmDel(false); }}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all">Yes, Delete</button>
            <button onClick={() => setConfirmDel(false)}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-white text-[#475569] border border-[#E8EDFF] hover:bg-[#F8FAFC] transition-all">Cancel</button>
          </div>
        </div>
      ) : adjusting ? (
        <div className="flex gap-2">
          <input type="number" className="input-grocery flex-1 text-sm py-2 px-3"
            placeholder="e.g. +50 or -10" value={adjVal}
            onChange={e => setAdjVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdj()} autoFocus />
          <button onClick={handleAdj} className="btn-grocery-primary px-3 py-2 text-sm">OK</button>
          <button onClick={() => { setAdjusting(false); setAdjVal(""); }} className="btn-grocery-secondary px-3 py-2 text-sm">X</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={handleRefill}
            title={`Refill to ${Math.max(product.minStock * 3, 30)} units`}
            className="py-2 text-xs rounded-xl font-semibold bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] text-[#15803D] hover:bg-[rgba(34,197,94,0.15)] transition-all col-span-2"
            disabled={product.stock >= Math.max(product.minStock * 3, 30)}>
            Refill {product.stock >= Math.max(product.minStock * 3, 30) ? "(Full)" : `(+${Math.max(product.minStock * 3, 30) - product.stock})`}
          </button>
          <button onClick={() => setAdjusting(true)} className="btn-grocery-secondary py-2 text-xs rounded-xl">± Adjust</button>
          <button onClick={() => setShowDiscount(true)} className="py-2 text-xs rounded-xl font-semibold bg-[rgba(225,29,72,0.08)] border border-[rgba(225,29,72,0.2)] text-[#E11D48] hover:bg-[rgba(225,29,72,0.15)] transition-all">% Discount</button>
          <button onClick={() => onAI(product)} className="py-2 text-xs rounded-xl font-semibold bg-[rgba(79,124,255,0.08)] border border-[rgba(79,124,255,0.2)] text-[#4F7CFF] hover:bg-[rgba(79,124,255,0.15)] transition-all">AI Analyst</button>
          <button onClick={() => onQR(product)} className="py-2 text-xs rounded-xl font-semibold bg-[rgba(168,85,247,0.08)] border border-[rgba(168,85,247,0.2)] text-[#7C3AED] hover:bg-[rgba(168,85,247,0.15)] transition-all">QR Code</button>
          <button onClick={() => setConfirmDel(true)} className="py-2 text-xs rounded-xl font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-all col-span-2">Delete Product</button>
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  const [inventory, setInventory]   = useState({ products: [], total_items: 0, low_stock_count: 0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [qrProduct, setQrProduct]   = useState(null);
  const [aiProduct, setAiProduct]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [flashMsg, setFlashMsg]     = useState("");
  const [flashType, setFlashType]   = useState("ok");
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll]     = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: "", price: "", stock: "", profit_rate: "10", category: "Grocery"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/inventory`);
      setInventory(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const flash = (msg, type = "ok") => {
    setFlashMsg(msg); setFlashType(type);
    setTimeout(() => setFlashMsg(""), 4000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.stock) return flash("Fill all required fields.", "err");
    setSaving(true);
    try {
      await axios.post(`${API}/inventory/add-product`, {
        name: form.name.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        profit_rate: parseFloat(form.profit_rate || 10),
        category: form.category,
        image: "",
      });
      flash(`Added "${form.name}" successfully!`);
      setForm({ name: "", price: "", stock: "", profit_rate: "10", category: "Grocery" });
      setShowAddForm(false);
      await loadInventory();
    } catch (err) {
      flash(err.response?.data?.detail || "Failed to add product.", "err");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    try {
      await axios.delete(`${API}/inventory/${id}`);
      flash(`✓ "${name}" deleted.`);
      await loadInventory();
    } catch { flash("Failed to delete product.", "err"); }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const r = await axios.delete(`${API}/inventory/all`);
      flash(`✓ ${r.data.message}`);
      setShowDeleteAll(false);
      await loadInventory();
    } catch { flash("Failed to delete all products.", "err"); }
    finally { setDeletingAll(false); }
  };

  const handleAdjust = async (id, adjustment) => {
    try {
      await axios.post(`${API}/inventory/${id}/adjust`, { adjustment });
      await loadInventory();
      flash(`Stock adjusted by ${adjustment > 0 ? "+" : ""}${adjustment}`);
    } catch { flash("Failed to adjust stock.", "err"); }
  };

  const handleDiscount = async (id, pct) => {
    try {
      if (pct <= 0) {
        await axios.post(`${API}/inventory/${id}/remove-discount`);
        flash("Discount removed.");
      } else {
        await axios.post(`${API}/inventory/${id}/discount`, { discount_pct: pct });
        flash(`${pct}% discount applied!`);
      }
      await loadInventory();
    } catch { flash("Failed to update discount.", "err"); }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) { flash("Please select a .csv file.", "err"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await axios.post(`${API}/upload-csv`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      flash(`✓ ${r.data.message}`);
      await loadInventory();
    } catch (err) {
      flash(err.response?.data?.detail || "CSV upload failed.", "err");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const csv = `name,price,stock,profit_rate,category,min_stock\nAashirvaad Atta 5kg,245,50,12,Grains,10\nAmul Butter 500g,265,30,15,Dairy,8\nMaggi Noodles 8-Pack,96,60,18,Snacks,15`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "inventory_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const products = inventory.products || [];
  const filtered = products.filter(p => {
    const matchCat  = catFilter === "All" || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
                        (p.sku || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalValue  = products.reduce((s, p) => s + p.stock * p.price, 0);
  const excessCount = products.filter(p => p.stock > (p.minStock || 5) * 3 && p.stock > 50).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 relative z-10">

      {/* Flash Message */}
      {flashMsg && (
        <div className={`fixed top-20 right-4 z-[300] px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm animate-fade-in-up ${
          flashType === "err" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {flashMsg}
        </div>
      )}

      {/* Header */}
      <div className="glass-panel-strong p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4F7CFF] to-[#6B8FFF] flex items-center justify-center text-xl font-black text-white shadow-lg">INV</div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Inventory Management</h1>
            <p className="text-sm text-[#475569]">Manage products, bulk import, and track stock levels</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <label className={`btn-grocery-secondary px-4 py-2.5 text-sm cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
            {uploading ? "⏳ Uploading…" : "⬆️ Import CSV"}
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          </label>
          {(inventory.products?.length > 0) && (
            <button
              onClick={() => setShowDeleteAll(true)}
              className="px-4 py-2.5 text-sm rounded-xl font-semibold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all"
            >
              🗑️ Delete All
            </button>
          )}
          <button onClick={() => setShowAddForm(v => !v)} className="btn-grocery-primary px-4 py-2.5 text-sm">
            {showAddForm ? "✕ Cancel" : "➕ Add Product"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: inventory.total_items, icon: "📦", color: "text-[#4F7CFF]" },
          { label: "Low Stock",      value: inventory.low_stock_count, icon: "⚠️", color: "text-orange-500" },
          { label: "Excess Stock",   value: excessCount, icon: "📊", color: "text-[#A855F7]" },
          { label: "Total Value",    value: `₹${totalValue.toFixed(0)}`, icon: "💰", color: "text-[#22C55E]" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-5 animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{s.label}</p>
              <span className="text-2xl">{s.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="glass-panel p-6 animate-fade-in-up border border-[rgba(79,124,255,0.2)]">
          <h2 className="text-base font-bold text-[#1E293B] mb-4 flex items-center gap-2">
            <span className="w-2 h-5 bg-[#4F7CFF] rounded-full" />
            Add New Product
          </h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-[#475569] mb-1">Product Name *</label>
              <input className="input-grocery w-full" placeholder="e.g. Amul Butter 500g" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Price (₹) *</label>
              <input type="number" min="0" step="0.01" className="input-grocery w-full" placeholder="e.g. 265"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Stock Quantity *</label>
              <input type="number" min="0" className="input-grocery w-full" placeholder="e.g. 50"
                value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Profit Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" className="input-grocery w-full" placeholder="e.g. 15"
                value={form.profit_rate} onChange={e => setForm(f => ({ ...f, profit_rate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1">Category</label>
              <select className="input-grocery w-full" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-grocery-secondary px-6 py-2.5">Cancel</button>
              <button type="submit" disabled={saving} className="btn-grocery-primary px-6 py-2.5">
                {saving ? "Adding…" : "➕ Add Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">🔍</span>
          <input
            className="input-grocery w-full pl-9"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={catFilter === cat
                ? { background: "#4F7CFF", color: "white", boxShadow: "0 4px 12px rgba(79,124,255,0.35)" }
                : { background: "rgba(255,255,255,0.7)", color: "#475569", border: "1px solid #E8EDFF" }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-[#94A3B8]">
          Showing <span className="font-bold text-[#475569]">{filtered.length}</span> of {products.length} products
        </p>
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-[#4F7CFF] font-semibold hover:underline">Clear search</button>
        )}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-14 h-14 border-4 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-16 flex flex-col items-center gap-4 text-center">
          <div className="text-6xl">📭</div>
          <h3 className="text-xl font-bold text-[#1E293B]">
            {products.length === 0 ? "No Products Yet" : "No Results Found"}
          </h3>
          <p className="text-[#94A3B8] text-sm max-w-sm">
            {products.length === 0
              ? "Add your first product using the form above, or import a CSV file to bulk-load inventory."
              : `No products match "${search}" in ${catFilter === "All" ? "any category" : catFilter}.`}
          </p>
          {products.length === 0 && (
            <button onClick={() => setShowAddForm(true)} className="btn-grocery-primary px-6 py-3 mt-2">
              ➕ Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p, i) => (
            <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}>
              <ProductCard
                product={p}
                onDelete={handleDelete}
                onAdjust={handleAdjust}
                onQR={setQrProduct}
                onDiscount={handleDiscount}
                onAI={setAiProduct}
              />
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      {qrProduct && <QRModal product={qrProduct} onClose={() => setQrProduct(null)} />}
      {/* AI Modal */}
      {aiProduct && <AIModal product={aiProduct} onClose={() => setAiProduct(null)} />}

      {/* Delete All Confirmation Modal */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={() => !deletingAll && setShowDeleteAll(false)}>
          <div className="glass-panel-strong w-full max-w-sm p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🗑️</div>
              <h3 className="text-lg font-bold text-[#1E293B]">Delete All Products?</h3>
              <p className="text-sm text-[#94A3B8] mt-2">
                This will permanently delete all <strong className="text-red-500">{inventory.total_items} products</strong> from your inventory. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAll(false)}
                disabled={deletingAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white border border-[#E8EDFF] text-[#475569] hover:bg-[#F8FAFC] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {deletingAll ? "Deleting…" : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
