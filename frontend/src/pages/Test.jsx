import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Simple SVG bar chart for 14-day sales
function SalesChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${(v / max) * 88}px`,
              background: i >= 7
                ? "linear-gradient(180deg, #4F7CFF, #6B8FFF)"
                : "linear-gradient(180deg, #93BAFF, #C4D8FF)",
            }}
            title={`Day ${i+1}: ${v} units`}
          />
          <span className="text-[9px] text-[#94A3B8] font-semibold">D{i+1}</span>
        </div>
      ))}
    </div>
  );
}

export default function AIStockTest() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/inventory-list`)
      .then(r => { setProducts(r.data); if (r.data.length > 0) setSelectedId(String(r.data[0].id)); })
      .catch(() => setError("Failed to load products."));
  }, []);

  const runCheck = async () => {
    if (!selectedId) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await axios.get(`${API}/ai-stock-test/${selectedId}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally { setLoading(false); }
  };

  const statusConfig = {
    critical: { bg: "bg-red-50 border-red-200", text: "text-red-600", icon: "🚨", badge: "badge-red" },
    low:      { bg: "bg-orange-50 border-orange-200", text: "text-orange-600", icon: "⚠️", badge: "badge-orange" },
    excess:   { bg: "bg-blue-50 border-blue-200", text: "text-blue-600", icon: "📦", badge: "badge-blue" },
    ok:       { bg: "bg-green-50 border-green-200", text: "text-green-600", icon: "✅", badge: "badge-teal" },
  };

  const sc = result ? (statusConfig[result.status_level] || statusConfig.ok) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 relative z-10">

      {/* Header */}
      <div className="glass-panel-strong p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4F7CFF] to-[#6B8FFF] flex items-center justify-center text-3xl shadow-lg">🧠</div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">AI Stock Test</h1>
            <p className="text-[#475569] text-sm">Analyze stock health, demand trends & reorder signals</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-6">
        <h2 className="text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Select Product to Analyze</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wider">Choose Product</label>
            <select
              className="input-grocery w-full"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setResult(null); }}
            >
              {products.length === 0 && <option>Loading products...</option>}
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={runCheck}
              disabled={loading || !selectedId}
              className="btn-grocery-primary px-8 py-3 whitespace-nowrap"
            >
              {loading ? "Analyzing..." : "🔍 Check Stock"}
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">⚠️ {error}</p>}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-panel p-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[rgba(79,124,255,0.2)] border-t-[#4F7CFF] rounded-full animate-spin"/>
          <p className="text-[#475569] font-semibold">Analyzing stock data with AI...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5 animate-fade-in-up">

          {/* Product + Status */}
          <div className={`glass-panel p-5 border-2 ${sc.bg}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{sc.icon}</span>
                  <h3 className="text-xl font-bold text-[#1E293B]">{result.product_name}</h3>
                </div>
                <p className="text-[#475569] text-sm">{result.category} • Current stock: <strong>{result.current_stock}</strong> units</p>
              </div>
              <span className={`badge ${sc.badge} text-sm px-4 py-2 font-bold`}>
                {result.stock_status}
              </span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Avg Daily Sale", value: result.avg_daily_sale, unit: "units/day", icon: "📊", color: "text-[#4F7CFF]" },
              { label: "Safety Stock", value: result.safety_stock, unit: "units buffer", icon: "🛡️", color: "text-[#FF9500]" },
              { label: "Reorder Point", value: result.reorder_point, unit: "units trigger", icon: "🔔", color: "text-[#A855F7]" },
              { label: "Days Remaining", value: result.days_remaining > 500 ? "∞" : result.days_remaining, unit: "at current pace", icon: "⏳", color: result.days_remaining < 7 ? "text-red-500" : "text-[#22C55E]" },
            ].map((m, i) => (
              <div key={i} className="glass-panel p-4 text-center">
                <span className="text-2xl block mb-2">{m.icon}</span>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">{m.label}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{m.unit}</p>
              </div>
            ))}
          </div>

          {/* 14-Day Sales Chart */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1E293B]">📈 14-Day Sales History</h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#C4D8FF] inline-block"/><span className="text-[#94A3B8]">Week 1</span></div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#4F7CFF] inline-block"/><span className="text-[#94A3B8]">Week 2</span></div>
              </div>
            </div>
            <SalesChart data={result.sales_14_days} />
          </div>

          {/* 7-Day Analysis */}
          <div className="glass-panel p-6">
            <h3 className="font-bold text-[#1E293B] mb-4">📊 7-Day Sales Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#EEF3FF] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase mb-1">Week 1 Total</p>
                <p className="text-2xl font-bold text-[#4F7CFF]">{result.week1_total}</p>
                <p className="text-xs text-[#94A3B8]">units sold</p>
              </div>
              <div className="bg-[#EEF3FF] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase mb-1">Week 2 Total</p>
                <p className="text-2xl font-bold text-[#4F7CFF]">{result.week2_total}</p>
                <p className="text-xs text-[#94A3B8]">units sold</p>
              </div>
              <div className="bg-[#EEF3FF] rounded-2xl p-4 text-center">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase mb-1">Sales Trend</p>
                <p className={`text-xl font-bold capitalize ${result.trend_7_days === "increasing" ? "text-[#22C55E]" : "text-[#FF9500]"}`}>
                  {result.trend_7_days === "increasing" ? "📈" : "📉"} {result.trend_7_days}
                </p>
                <p className="text-xs text-[#94A3B8]">vs previous week</p>
              </div>
            </div>
          </div>

          {/* Stock Status Advice */}
          <div className={`glass-panel p-5 border ${sc.bg}`}>
            <h3 className={`font-bold mb-2 ${sc.text}`}>{sc.icon} Stock Recommendation</h3>
            <p className="text-[#475569] text-sm leading-relaxed">
              {result.status_level === "critical" &&
                `⚠️ Stock is at ZERO for ${result.product_name}. Immediately restock. You need at least ${result.reorder_point} units.`}
              {result.status_level === "low" &&
                `Stock is below the safety threshold of ${result.safety_stock} units. Reorder immediately. Reorder point is ${result.reorder_point} units.`}
              {result.status_level === "excess" &&
                `Stock level is very high. Consider running promotions or slowing down orders. Avg daily sale is only ${result.avg_daily_sale} units.`}
              {result.status_level === "ok" &&
                `Stock is healthy! At the current daily sale of ${result.avg_daily_sale} units/day, you have approximately ${result.days_remaining} days of stock remaining. Reorder when stock hits ${result.reorder_point} units.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
