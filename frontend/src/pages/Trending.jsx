import { useState, useEffect } from "react";
import axios from "axios";
import AlertBanner from "../components/AlertBanner";

const API = "http://localhost:8000";

function DiscountBadge({ pct }) {
  const color = pct >= 70 ? { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" }
              : pct >= 50 ? { bg: "#FFF7ED", text: "#C2410C", border: "#FED7AA" }
              :              { bg: "#FEFCE8", text: "#B45309", border: "#FDE68A" };
  return (
    <span className="px-3 py-1.5 rounded-xl font-black text-lg border"
      style={{ background: color.bg, color: color.text, border: `1.5px solid ${color.border}` }}>
      {pct}% OFF
    </span>
  );
}

export default function Trending() {
  const [data, setData]           = useState(null);
  const [allProducts, setAll]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState(false);
  const [message, setMessage]     = useState("");
  const [msgType, setMsgType]     = useState("ok");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, inv] = await Promise.all([
        axios.get(`${API}/trending`),
        axios.get(`${API}/inventory`),
      ]);
      setData(t.data);
      setAll(inv.data.products || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const flash = (msg, type = "ok") => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const applyDiscounts = async () => {
    setApplying(true);
    try {
      const res = await axios.post(`${API}/apply-discounts`);
      flash(`✓ ${res.data.message} (${res.data.applied_to?.length || 0} products updated)`);
      await loadAll();
    } catch { flash("Failed to apply discounts.", "err"); }
    finally { setApplying(false); }
  };

  if (loading && !data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-14 h-14 border-4 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">
      <AlertBanner />

      {/* Header */}
      <div className="glass-panel-strong p-7 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #4F7CFF, #E11D48)" }} />
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-xl"
              style={{ background: "linear-gradient(135deg, #4F7CFF, #6B8FFF)" }}>
              ✨
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1E293B] mb-1">AI Analyst & Trending</h1>
              <p className="text-[#475569] text-sm">{data?.ai_insight || "Analyzing market demand…"}</p>
              {message && (
                <p className={`text-sm mt-2 font-bold px-3 py-1.5 rounded-lg inline-block ${
                  msgType === "err"
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}>{message}</p>
              )}
            </div>
          </div>
          <button onClick={applyDiscounts} disabled={applying}
            className="px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #E11D48, #BE123C)" }}>
            {applying ? "Analyzing…" : "🤖 Auto-Apply Discounts"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Discounted",  value: data?.discounted_products?.length ?? 0, icon: "🏷️", bg: "#FFF1F2", border: "#FECDD3", color: "#E11D48" },
          { label: "Top Selling", value: data?.top_selling?.length ?? 0,         icon: "🔥", bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB" },
          { label: "Dead Stock",  value: data?.dead_stock?.length ?? 0,          icon: "💀", bg: "#FFF1F2", border: "#FECDD3", color: "#BE123C" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-5 flex items-center gap-4 animate-fade-in-up"
            style={{ borderColor: s.border, animationDelay: `${i * 0.08}s` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row: Discounts */}
      <div className="glass-panel p-6" style={{ borderColor: "#FECDD3" }}>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2 text-[#1E293B]">
          <span className="w-2 h-6 rounded-full" style={{ background: "#E11D48" }} />
          Discount Offers
        </h2>
        <p className="text-xs text-[#94A3B8] mb-4">High stock / low demand — auto-discounted by AI</p>

        {!data?.discounted_products?.length ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <span className="text-5xl opacity-30">🏷️</span>
            <p className="text-sm text-[#94A3B8] italic text-center">No active discounts.<br />Click "Auto-Apply Discounts".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.discounted_products.map((p, i) => {
              const original = allProducts.find(a => a.name === p.name);
              const origPrice = original?.price ?? 0;
              const discounted = origPrice * (1 - p.discount_pct / 100);
              return (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl transition-all hover:shadow-md"
                  style={{ background: "#FFF1F2", border: "1.5px solid #FECDD3" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1E293B] truncate">{p.name}</p>
                    {original && (
                      <p className="text-[10px] font-mono text-[#94A3B8] mt-0.5">
                        SKU: {original.sku || "N/A"}
                      </p>
                    )}
                    <p className="text-xs text-[#E11D48] mt-0.5">{p.reason}</p>
                    {origPrice > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#94A3B8] line-through">₹{origPrice.toFixed(0)}</span>
                        <span className="text-sm font-bold text-[#16A34A]">₹{discounted.toFixed(0)}</span>
                        <span className="text-xs text-[#94A3B8]">saves ₹{(origPrice - discounted).toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                  <DiscountBadge pct={p.discount_pct} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row: Top Selling + Dead Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Selling */}
        <div className="glass-panel p-6" style={{ borderColor: "#BFDBFE" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#1E293B]">
            <span className="w-2 h-6 rounded-full" style={{ background: "#2563EB" }} />
            Top Selling
            <span className="text-xs font-normal text-[#94A3B8] ml-1">(Low Stock Warning)</span>
          </h2>
          {!data?.top_selling?.length ? (
            <p className="text-[#94A3B8] text-sm italic py-6 text-center">All products have sufficient stock.</p>
          ) : (
            <div className="space-y-2">
              {data.top_selling.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[#94A3B8] w-5">#{i + 1}</span>
                    <span className="text-[#1E293B] font-semibold text-sm">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${p.stock < 20 ? "text-red-600" : "text-[#2563EB]"}`}>
                      {p.stock} units
                    </span>
                    {p.stock < 20 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3" }}>
                        Reorder
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dead Stock */}
        <div className="glass-panel p-6" style={{ borderColor: "#FECDD3" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#1E293B]">
            <span className="w-2 h-6 rounded-full" style={{ background: "#BE123C" }} />
            Dead Stock
            <span className="text-xs font-normal text-[#94A3B8] ml-1">(Action Required)</span>
          </h2>
          {!data?.dead_stock?.length ? (
            <p className="text-[#94A3B8] text-sm italic py-6 text-center">No dead stock identified. 🎉</p>
          ) : (
            <div className="space-y-2">
              {data.dead_stock.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-red-50">
                  <span className="text-[#1E293B] font-semibold text-sm">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 text-sm font-bold">{p.stock} units</span>
                    {p.discount > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA" }}>
                        {p.discount}% OFF
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3" }}>
                        No Discount
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
