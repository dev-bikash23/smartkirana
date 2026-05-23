import { useState, useEffect } from "react";
import axios from "axios";
import HistoryChart from "../components/HistoryChart";
import ForecastChart from "../components/ForecastChart";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("supply_token") || "";
}
function authHeaders() { return { headers: { Authorization: `Bearer ${getToken()}` } }; }

// Color pool for dynamic products
const COLOR_POOL = [
  { gradient: "linear-gradient(135deg, #4F7CFF, #6B8FFF)", text: "#4F7CFF", glow: "#4F7CFF", light: "#EEF3FF", border: "#BFDBFE" },
  { gradient: "linear-gradient(135deg, #E11D48, #BE123C)",  text: "#E11D48", glow: "#E11D48", light: "#FFF1F2", border: "#FECDD3" },
  { gradient: "linear-gradient(135deg, #16A34A, #15803D)",  text: "#16A34A", glow: "#16A34A", light: "#F0FDF4", border: "#BBF7D0" },
  { gradient: "linear-gradient(135deg, #9333EA, #7E22CE)",  text: "#9333EA", glow: "#9333EA", light: "#FAF5FF", border: "#E9D5FF" },
  { gradient: "linear-gradient(135deg, #EA580C, #C2410C)",  text: "#EA580C", glow: "#EA580C", light: "#FFF7ED", border: "#FED7AA" },
  { gradient: "linear-gradient(135deg, #0EA5E9, #0284C7)",  text: "#0EA5E9", glow: "#0EA5E9", light: "#F0F9FF", border: "#BAE6FD" },
  { gradient: "linear-gradient(135deg, #D97706, #B45309)",  text: "#D97706", glow: "#D97706", light: "#FFFBEB", border: "#FDE68A" },
  { gradient: "linear-gradient(135deg, #DB2777, #BE185D)",  text: "#DB2777", glow: "#DB2777", light: "#FDF2F8", border: "#FBCFE8" },
];

function getColor(index) {
  return COLOR_POOL[index % COLOR_POOL.length];
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-[#E8EDFF] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function History() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Load inventory products from DB
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await axios.get(`${API}/inventory`, authHeaders());
        const prods = res.data.products || [];
        setProducts(prods);
        if (prods.length) setSelected(prods[0]);
      } catch (err) { console.error(err); }
    };
    loadProducts();
  }, []);

  // Fetch 30-day real-date chart for ANY selected product
  useEffect(() => {
    if (!selected) { setSalesData(null); return; }
    setLoading(true);
    axios.get(`${API}/history/db/${selected.id}?demo=${demoMode}`, authHeaders())
      .then(r => setSalesData(r.data))
      .catch(() => setSalesData(null))
      .finally(() => setLoading(false));
  }, [selected, demoMode]);

  const colorIdx = products.findIndex(p => p.id === selected?.id);
  const color = getColor(colorIdx >= 0 ? colorIdx : 0);

  // Compute analytics from live DB data
  const stockLevel = selected?.stock ?? 0;
  const minStock = selected?.minStock ?? 0;
  const price = selected?.price ?? 0;
  const stockValue = stockLevel * price;
  const stockRatio = minStock > 0 ? (stockLevel / minStock).toFixed(1) : "∞";
  const isLow = stockLevel < minStock;
  const isExcess = minStock > 0 && stockLevel >= minStock * 4;
  const discountedPrice = selected?.discount_pct > 0 ? price * (1 - selected.discount_pct / 100) : null;

  const statusLabel = stockLevel <= 0 ? "Out of Stock" : isLow ? "Low Stock" : isExcess ? "Excess Stock" : "Healthy";
  const statusColor = stockLevel <= 0 ? "#BE123C" : isLow ? "#EA580C" : isExcess ? "#9333EA" : "#16A34A";
  const statusBg    = stockLevel <= 0 ? "#FFF1F2" : isLow ? "#FFF7ED" : isExcess ? "#FAF5FF" : "#F0FDF4";
  const statusBorder= stockLevel <= 0 ? "#FECDD3" : isLow ? "#FED7AA" : isExcess ? "#E9D5FF" : "#BBF7D0";

  // Chart stats computed dynamically
  const hasHistory = salesData && salesData.history_units && salesData.history_units.length > 0;
  
  const avgSales = hasHistory
    ? Math.round(salesData.history_units.reduce((a, b) => a + b, 0) / salesData.history_units.length)
    : salesData && salesData.units_sold && salesData.units_sold.length > 0
    ? Math.round(salesData.units_sold.reduce((a, b) => a + b, 0) / salesData.units_sold.length)
    : 0;
    
  const maxSales = hasHistory 
    ? Math.max(...salesData.history_units) 
    : salesData && salesData.units_sold && salesData.units_sold.length > 0
    ? Math.max(...salesData.units_sold)
    : 0;
    
  const minSales = hasHistory
    ? Math.min(...salesData.history_units)
    : salesData && salesData.units_sold && salesData.units_sold.length > 0
    ? Math.min(...salesData.units_sold)
    : 0;
    
  const totalSales = hasHistory
    ? salesData.history_units.reduce((a, b) => a + b, 0)
    : salesData && salesData.units_sold && salesData.units_sold.length > 0
    ? salesData.units_sold.reduce((a, b) => a + b, 0)
    : 0;

  if (!products.length) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">

      {/* ── Hero Header ── */}
      <div className="glass-panel-strong p-7 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #4F7CFF, #6B8FFF)" }} />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-xl"
            style={{ background: "linear-gradient(135deg, #4F7CFF, #6B8FFF)" }}>
            📈
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-[#1E293B]">Sales & Stock History</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: "#EEF3FF", color: "#4F7CFF", border: "1px solid #BFDBFE" }}>
                📦 {products.length} Products
              </span>
            </div>
            <p className="text-[#475569] text-sm">
              Live inventory analytics · Historical sales trends · Stock performance
            </p>
          </div>
        </div>
      </div>

      {/* ── Product Selector ── */}
      <div className="glass-panel p-6">
        <label className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">
          📦 Select Product to Analyze ({products.length} registered products)
        </label>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {products.map((p, i) => {
            const c = getColor(i);
            const isActive = selected?.id === p.id;
            return (
              <button key={p.id} onClick={() => setSelected(p)}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all border"
                style={isActive ? {
                  background: c.gradient,
                  color: "white",
                  borderColor: "transparent",
                  boxShadow: `0 4px 14px ${c.glow}30`,
                  transform: "scale(1.05)",
                } : {
                  background: c.light,
                  color: c.text,
                  borderColor: c.border,
                }}>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected Product Panel ── */}
      {selected && (
        <div className="space-y-6 animate-fade-in-up">

          {/* Demo Toggle Banner */}
          <div className="glass-panel p-4 flex flex-wrap items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2.5xl">🧪</span>
              <div>
                <p className="font-bold text-sm text-purple-950">Analytics Mode Selection</p>
                <p className="text-xs text-purple-700">Choose between real store checkout sales or simulated AI demo graphs.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              <span className="ml-3 text-xs font-bold text-purple-950">{demoMode ? "Demo Mode ON (Simulated)" : "Real Store Mode"}</span>
            </label>
          </div>

          {/* Product info + stats */}
          <div className="glass-panel overflow-hidden" style={{ borderColor: color.border }}>
            {/* Color top strip */}
            <div className="h-1.5 w-full" style={{ background: color.gradient }} />
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md"
                    style={{ background: color.light, border: `1.5px solid ${color.border}` }}>
                    {selected.image || "📦"}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#1E293B]">{selected.name}</h2>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{selected.category}</p>
                    <p className="text-xs font-mono font-bold text-[#94A3B8] mt-0.5">
                      SKU: <span className="text-[#475569]">{selected.sku || "N/A"}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: statusBg, color: statusColor, border: `1.5px solid ${statusBorder}` }}>
                    {statusLabel}
                  </span>
                  {selected.is_seasonal && (
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
                      🌿 {selected.season_tag || "Seasonal"}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Current Stock",  value: `${stockLevel} units`, color: color.text, bg: color.light, border: color.border },
                  { label: "Min Stock Level",value: `${minStock} units`,   color: "#94A3B8",  bg: "#F8FAFC",   border: "#E8EDFF" },
                  { label: "Price",          value: discountedPrice
                      ? `₹${discountedPrice.toFixed(0)}`
                      : `₹${price.toFixed(0)}`,
                    color: discountedPrice ? "#E11D48" : "#1E293B", bg: discountedPrice ? "#FFF1F2" : "#F8FAFC", border: discountedPrice ? "#FECDD3" : "#E8EDFF" },
                  { label: "Stock Value",    value: `₹${stockValue.toFixed(0)}`, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl p-4" style={{ background: s.bg, border: `1.5px solid ${s.border}` }}>
                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Stock ratio bar */}
              <div className="rounded-2xl p-4" style={{ background: "#F8FAFC", border: "1.5px solid #E8EDFF" }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-[#475569]">Stock vs Min Level</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: statusBg, color: statusColor }}>
                    {stockRatio}× ratio
                  </span>
                </div>
                <MiniBar value={Math.min(stockLevel, minStock * 5)} max={minStock * 5 || stockLevel} color={color.text} />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
                  <span>0</span>
                  <span>Min: {minStock}</span>
                  <span>{Math.min(stockLevel, minStock * 5)}</span>
                </div>
              </div>

              {/* Discount info */}
              {selected.discount_pct > 0 && (
                <div className="mt-4 rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}>
                  <div>
                    <p className="text-xs font-semibold text-[#C2410C] uppercase tracking-wider">Active Discount</p>
                    <p className="text-sm text-[#475569] mt-0.5">{selected.discount_reason || "AI-applied discount"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#C2410C]">{selected.discount_pct}% OFF</p>
                    <p className="text-xs text-[#94A3B8]">₹{price.toFixed(0)} → ₹{discountedPrice?.toFixed(0)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CSV-based sales chart ── */}
          {loading && (
            <div className="glass-panel p-10 flex items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
              <span className="text-[#475569] font-semibold text-sm">Loading sales history…</span>
            </div>
          )}

          {!loading && salesData && salesData.source === "actual_empty" && (
            <div className="glass-panel p-16 flex flex-col items-center gap-4 text-center border-dashed border-2 border-purple-300 bg-purple-50/5 animate-fade-in-up">
              <div className="text-6xl animate-pulse">📊</div>
              <h3 className="text-xl font-bold text-[#1E293B]">No Sales Logged Yet</h3>
              <p className="text-[#94A3B8] text-sm max-w-sm">
                This product has no registered customer sales in your database yet. Complete checkouts using the <strong>POS Scanner</strong> to start building real-time historical reports.
              </p>
              <button onClick={() => setDemoMode(true)} className="px-6 py-3 rounded-xl font-bold text-white shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 transition-all hover:scale-105 active:scale-95">
                🧪 Enable Demo Analytics Mode
              </button>
            </div>
          )}

          {!loading && salesData && salesData.source !== "actual_empty" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 14-Day Sales History */}
                <div className="glass-panel p-6 overflow-hidden animate-fade-in-up" style={{ borderColor: color.border }}>
                  <h3 className="text-base font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-5 bg-[#4F7CFF] rounded-full" style={{ background: color.gradient }} />
                    📈 14-Day Sales History
                  </h3>
                  <div className="h-[280px]">
                    <HistoryChart 
                      dates={salesData.history_dates || []} 
                      unitsSold={salesData.history_units || []} 
                      product={selected.name} 
                      chartColor={color.text} 
                    />
                  </div>
                </div>

                {/* 7-Day Forecast Chart */}
                <div className="glass-panel p-6 overflow-hidden animate-fade-in-up" style={{ borderColor: color.border }}>
                  <h3 className="text-base font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-5 bg-[#22C55E] rounded-full" />
                    🔮 7-Day Future Projection
                  </h3>
                  <div className="h-[280px]">
                    <ForecastChart forecast={salesData.units_sold || []} />
                  </div>
                </div>
              </div>

              <div className="glass-panel p-5 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: color.border }}>
                <div>
                  <p className="text-sm font-bold text-[#1E293B]">🔮 Smart Clearance Insights</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">Calculated stockout rate relative to current stock</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#475569]">Stockout countdown:</span>
                  <span className="text-sm font-black px-4 py-1.5 rounded-xl text-white bg-indigo-600 shadow-md">
                    {salesData.stockout_days === 999 || salesData.stockout_days === "N/A" ? "Healthy (∞)" : `${salesData.stockout_days} days`}
                  </span>
                </div>
              </div>

              <div className="glass-panel overflow-hidden" style={{ borderColor: color.border }}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-[#1E293B]">🔮 7-Day Predicted Sales Log</h3>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        {salesData?.source === "gru_model"
                          ? "🤖 GRU Neural Network · Real future dates"
                          : "🧠 AI-simulated forecast · Real future dates"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: color.light, color: color.text, border: `1px solid ${color.border}` }}>
                      {salesData.dates?.length || 0} day forecast
                    </span>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Total Sales",  value: totalSales, icon: "📦" },
                      { label: "Peak Day",     value: maxSales,   icon: "🚀" },
                      { label: "Lowest Day",   value: minSales,   icon: "📉" },
                      { label: "Daily Avg",    value: avgSales,   icon: "📊" },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl p-3 text-center"
                        style={{ background: color.light, border: `1px solid ${color.border}` }}>
                        <div className="text-xl mb-1">{s.icon}</div>
                        <p className="text-lg font-black" style={{ color: color.text }}>{s.value}</p>
                        <p className="text-[10px] text-[#94A3B8] uppercase font-semibold tracking-wider mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Data table */}
                  <div className="rounded-2xl overflow-hidden border" style={{ borderColor: color.border }}>
                    <div className="px-4 py-3 flex justify-between items-center"
                      style={{ background: color.light }}>
                      <h4 className="font-bold text-sm text-[#1E293B]">📅 Forecast Table</h4>
                      <span className="text-xs text-[#94A3B8]">{salesData.dates?.length || 0} days forecast</span>
                    </div>
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-left">
                        <thead className="bg-[#F8FAFC] sticky top-0">
                          <tr>
                            {["Day", "Date", "Predicted Units", "vs Avg", "Demand"].map(h => (
                              <th key={h} className="px-4 py-3 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {salesData.dates?.map((d, i) => {
                            const val = salesData.units_sold[i];
                            const diff = val - avgSales;
                            const isAbove = diff >= 0;
                            return (
                              <tr key={d} className="border-t border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                                <td className="px-4 py-3 text-xs font-mono text-[#94A3B8]">{i + 1}</td>
                                <td className="px-4 py-3 text-sm text-[#475569] font-medium">{d}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex px-3 py-1 rounded-lg text-sm font-bold"
                                    style={{ background: color.light, color: color.text, border: `1px solid ${color.border}` }}>
                                    {val} units
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-bold ${isAbove ? "text-[#16A34A]" : "text-[#E11D48]"}`}>
                                    {isAbove ? "▲" : "▼"} {Math.abs(diff)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="w-20">
                                    <MiniBar value={val} max={maxSales} color={color.text} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No chart data */}
          {!loading && !salesData && (
            <div className="glass-panel p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">No Analytics Available</h3>
              <p className="text-[#94A3B8] text-sm">Select a product to view its sales history.</p>
            </div>
          )}

          {/* All products summary table */}
          <div className="glass-panel overflow-hidden">
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4F7CFF, #E11D48, #16A34A)" }} />
            <div className="px-6 py-4 border-b border-[#E8EDFF] flex justify-between items-center">
              <h3 className="font-bold text-[#1E293B] text-base">📋 All Products — Stock Summary</h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "#EEF3FF", color: "#4F7CFF", border: "1px solid #BFDBFE" }}>
                {products.length} SKUs
              </span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC] sticky top-0">
                  <tr>
                    {["#", "Product Name", "SKU", "Category", "Stock", "Min Stock", "Price", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const pLow = p.stock < p.minStock;
                    const pExcess = p.minStock > 0 && p.stock >= p.minStock * 4;
                    const pStatus = p.stock <= 0 ? "Out of Stock" : pLow ? "Low Stock" : pExcess ? "Excess" : "Healthy";
                    const pColor  = p.stock <= 0 ? "#BE123C" : pLow ? "#EA580C" : pExcess ? "#9333EA" : "#16A34A";
                    const pBg    = p.stock <= 0 ? "#FFF1F2" : pLow ? "#FFF7ED" : pExcess ? "#FAF5FF" : "#F0FDF4";
                    const pBorder= p.stock <= 0 ? "#FECDD3" : pLow ? "#FED7AA" : pExcess ? "#E9D5FF" : "#BBF7D0";
                    const c = getColor(i);
                    return (
                      <tr key={p.id}
                        className={`border-t border-[#F1F5F9] transition-colors cursor-pointer ${selected?.id === p.id ? "" : "hover:bg-[#F8FAFC]"}`}
                        style={selected?.id === p.id ? { background: c.light } : {}}
                        onClick={() => setSelected(p)}>
                        <td className="px-4 py-3 text-xs font-mono text-[#94A3B8]">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-sm text-[#1E293B]">{p.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                            style={{ background: c.light, color: c.text, border: `1px solid ${c.border}` }}>
                            {p.sku || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#475569]">{p.category}</td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: pLow ? "#EA580C" : "#1E293B" }}>
                          {p.stock}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{p.minStock}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#1E293B]">
                          {p.discount_pct > 0 ? (
                            <span>
                              <span className="line-through text-[#94A3B8] text-xs">₹{p.price?.toFixed(0)}</span>{" "}
                              <span style={{ color: "#E11D48" }}>₹{(p.price * (1 - p.discount_pct / 100)).toFixed(0)}</span>
                            </span>
                          ) : `₹${p.price?.toFixed(0)}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-1 rounded-full"
                            style={{ background: pBg, color: pColor, border: `1px solid ${pBorder}` }}>
                            {pStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
