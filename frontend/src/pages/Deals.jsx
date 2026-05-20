import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const DISCOUNT_TIERS = [
  { min: 70, label: "Mega Deal 🔥", bg: "#FFF1F2", border: "#FECDD3", text: "#BE123C", badge: "#E11D48" },
  { min: 50, label: "Hot Offer ⚡",  bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", badge: "#EA580C" },
  { min: 30, label: "Good Deal ✨",  bg: "#FEFCE8", border: "#FDE68A", text: "#B45309", badge: "#D97706" },
  { min: 0,  label: "Offer 🏷️",     bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", badge: "#16A34A" },
];

function getTier(pct) {
  return DISCOUNT_TIERS.find(d => pct >= d.min) || DISCOUNT_TIERS[DISCOUNT_TIERS.length - 1];
}

function StatPill({ icon, label, value, color, bg, border }) {
  return (
    <div className="glass-panel p-5 flex items-center gap-4 animate-fade-in-up"
      style={{ borderColor: border }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
        style={{ background: bg, border: `1px solid ${border}` }}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

function DiscountCard({ p }) {
  const tier = getTier(p.discount_pct);
  const discountedPrice = p.price * (1 - p.discount_pct / 100);
  const savings = p.price - discountedPrice;

  return (
    <div className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-default"
      style={{ background: tier.bg, border: `1.5px solid ${tier.border}`, boxShadow: `0 4px 20px ${tier.border}` }}>

      {/* Icon + badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
          style={{ background: "white", border: `1px solid ${tier.border}` }}>
          {p.image || "📦"}
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: tier.badge }}>
          {p.discount_pct}% OFF
        </span>
      </div>

      {/* Name + SKU */}
      <h3 className="text-base font-bold truncate mb-0.5" style={{ color: tier.text }}>{p.name}</h3>
      <p className="text-xs text-[#94A3B8] mb-1">{p.category}</p>
      <p className="text-[10px] font-mono font-bold text-[#94A3B8] mb-3 tracking-wider">
        SKU: <span className="text-[#475569]">{p.sku || "N/A"}</span>
      </p>

      {/* Price */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-xs text-[#94A3B8] line-through">₹{p.price.toFixed(0)}</p>
          <p className="text-2xl font-black" style={{ color: tier.badge }}>₹{discountedPrice.toFixed(0)}</p>
          <p className="text-xs font-semibold text-[#22C55E] mt-0.5">Save ₹{savings.toFixed(0)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#94A3B8] uppercase font-semibold">Stock</p>
          <p className="text-lg font-bold text-[#1E293B]">{p.stock}</p>
        </div>
      </div>

      {/* Deal label bar */}
      <div className="rounded-xl py-2 text-center text-xs font-bold"
        style={{ background: "white", border: `1px solid ${tier.border}`, color: tier.badge }}>
        {tier.label}
      </div>

      {p.discount_reason && (
        <p className="mt-2 text-[10px] text-[#94A3B8] italic text-center">💡 {p.discount_reason}</p>
      )}
    </div>
  );
}

export default function Deals() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState(false);
  const [message, setMessage]     = useState("");
  const [msgType, setMsgType]     = useState("ok");
  const [filterTier, setFilterTier] = useState("all");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/inventory`);
      setProducts(res.data.products || []);
    } catch (e) { console.error(e); }
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
      flash(`✓ ${res.data.message} · ${res.data.applied_to?.length || 0} products updated`);
      await fetchAll();
    } catch { flash("Failed to apply discounts.", "err"); }
    finally { setApplying(false); }
  };

  const discounted = products.filter(p => (p.discount_pct ?? 0) > 0);
  const totalSavings = discounted.reduce((s, p) => s + p.price * p.discount_pct / 100, 0);
  const megaDeals = discounted.filter(p => p.discount_pct >= 70);
  const hotOffers = discounted.filter(p => p.discount_pct >= 50 && p.discount_pct < 70);
  const goodDeals = discounted.filter(p => p.discount_pct >= 30 && p.discount_pct < 50);

  const filtered = filterTier === "all" ? discounted
    : filterTier === "mega" ? megaDeals
    : filterTier === "hot" ? hotOffers
    : goodDeals;

  const tierTabs = [
    { id: "all",  label: "🛍️ All Deals",   count: discounted.length, color: "#4F7CFF" },
    { id: "mega", label: "🔥 Mega (70%+)",  count: megaDeals.length,  color: "#E11D48" },
    { id: "hot",  label: "⚡ Hot (50%+)",    count: hotOffers.length,  color: "#EA580C" },
    { id: "good", label: "✨ Good (30%+)",   count: goodDeals.length,  color: "#D97706" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">

      {/* Header */}
      <div className="glass-panel-strong p-7 relative overflow-hidden"
        style={{ borderColor: "rgba(79,124,255,0.25)" }}>
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #4F7CFF, #F43F5E)" }} />
        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-xl"
              style={{ background: "linear-gradient(135deg, #4F7CFF, #F43F5E)" }}>
              🛍️
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#1E293B] mb-1">Deals & Discounts</h1>
              <p className="text-[#475569] text-sm">AI-powered discounts · Live inventory pricing</p>
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
            {applying ? "Analyzing…" : "🤖 Apply Discounts"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill icon="🏷️" label="Discounted" value={discounted.length} color="#E11D48" bg="#FFF1F2" border="#FECDD3" />
        <StatPill icon="🔥" label="Mega Deals"  value={megaDeals.length}  color="#BE123C" bg="#FFF1F2" border="#FECDD3" />
        <StatPill icon="⚡" label="Hot Offers"   value={hotOffers.length}  color="#EA580C" bg="#FFF7ED" border="#FED7AA" />
        <StatPill icon="💰" label="Total Savings" value={`₹${totalSavings.toFixed(0)}`} color="#22C55E" bg="#F0FDF4" border="#BBF7D0" />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tierTabs.map(t => (
          <button key={t.id} onClick={() => setFilterTier(t.id)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
            style={filterTier === t.id
              ? { background: t.color, color: "white", boxShadow: `0 4px 14px ${t.color}40` }
              : { background: "white", color: "#475569", border: "1.5px solid #E8EDFF" }}>
            {t.label}
            <span className="text-xs px-2 py-0.5 rounded-full font-black"
              style={filterTier === t.id
                ? { background: "rgba(255,255,255,0.25)", color: "white" }
                : { background: "#EEF3FF", color: "#4F7CFF" }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-14 h-14 border-4 border-[#E8EDFF] border-t-[#4F7CFF] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-16 flex flex-col items-center gap-4 text-center">
          <div className="text-6xl">🛍️</div>
          <h3 className="text-xl font-bold text-[#1E293B]">No Active Deals</h3>
          <p className="text-[#94A3B8] text-sm max-w-sm">
            Click <strong>"Apply Discounts"</strong> to let AI analyze your inventory and auto-apply discounts to high-stock / low-demand products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => <DiscountCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
