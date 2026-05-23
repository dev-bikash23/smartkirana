import { useState, useEffect } from "react";
import axios from "axios";

// ─── Discount Tier Configs (matches backend DISCOUNT_TIERS) ───────────────
const TIER_CONFIGS = [
  { pct: 70, label: "Mega Clearance 🔥",  bg: "var(--deal-red-bg)",    border: "var(--deal-red-border)",    text: "var(--deal-red-text)",    badge: "#E11D48" },
  { pct: 50, label: "Hot Clearance ⚡",   bg: "var(--deal-orange-bg)", border: "var(--deal-orange-border)", text: "var(--deal-orange-text)", badge: "#EA580C" },
  { pct: 30, label: "30 Day Special 💫",  bg: "var(--deal-yellow-bg)", border: "var(--deal-yellow-border)", text: "var(--deal-yellow-text)", badge: "#D97706" },
  { pct: 15, label: "Weekend Deal 🌟",    bg: "var(--deal-green-bg)",  border: "var(--deal-green-border)",  text: "var(--deal-green-text)",  badge: "#16A34A" },
  { pct: 0,  label: "Special Offer 🏷️",  bg: "var(--deal-green-bg)",  border: "var(--deal-green-border)",  text: "var(--deal-green-text)",  badge: "#16A34A" },
];

function getTierConfig(pct) {
  return TIER_CONFIGS.find(t => pct >= t.pct) || TIER_CONFIGS[TIER_CONFIGS.length - 1];
}

// Group products by their exact discount percentage
function groupByDiscount(products) {
  const map = {};
  for (const p of products) {
    const key = p.discount_pct;
    if (!map[key]) map[key] = [];
    map[key].push(p);
  }
  return Object.entries(map)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([pct, items]) => ({ pct: Number(pct), items }));
}

// ─── Countdown Timer ──────────────────────────────────────────────────────
function CountdownBadge({ daysLeft, durationDays, expiresAt, type }) {
  if (daysLeft === null || daysLeft === undefined) return null;

  const isExpired = daysLeft <= 0;
  const isUrgent  = daysLeft <= 3;
  const isManual  = type === "manual";

  const label = durationDays === 15 ? "15-Day Sale" : durationDays === 30 ? "30-Day Sale" : `${durationDays}-Day Sale`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1">
      {/* Sale duration label */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full deal-sale-label">
        ⏱ {label}
        {isManual && " (Custom)"}
      </span>
      {/* Days remaining */}
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
        isExpired ? "deal-expired-badge" :
        isUrgent  ? "deal-urgent-badge" :
                    "deal-timer-badge"
      }`}>
        {isExpired ? "⚠️ Expired" : isUrgent ? `🔥 ${daysLeft}d left!` : `${daysLeft} days left`}
      </span>
    </div>
  );
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
        <p className="deal-stat-label">{label}</p>
        <p className="text-2xl font-black" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

function DiscountGroupHeader({ pct, count }) {
  const cfg = getTierConfig(pct);
  return (
    <div className="flex items-center gap-3 mt-8 mb-4">
      <div className="px-4 py-2 rounded-2xl font-black text-white text-sm shadow-lg"
        style={{ background: cfg.badge }}>
        {pct}% OFF
      </div>
      <div className="flex-1 h-px" style={{ background: cfg.border }} />
      <span className="text-sm font-bold px-3 py-1 rounded-full"
        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
        {count} product{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function DiscountCard({ p }) {
  const cfg = getTierConfig(p.discount_pct);
  const discountedPrice = p.price * (1 - p.discount_pct / 100);
  const savings = p.price - discountedPrice;

  return (
    <div className="deal-card rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-default"
      style={{ borderColor: cfg.border, boxShadow: `0 4px 20px ${cfg.border}` }}>

      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm deal-card-icon"
          style={{ border: `1px solid ${cfg.border}` }}>
          {p.image || "📦"}
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: cfg.badge }}>
          {p.discount_pct}% OFF
        </span>
      </div>

      <h3 className="text-base font-bold truncate mb-0.5 deal-card-name" style={{ color: cfg.text }}>{p.name}</h3>
      <p className="deal-card-category text-xs mb-1">{p.category}</p>
      <p className="text-[10px] font-mono font-bold deal-card-sku mb-1 tracking-wider">
        SKU: <span className="deal-card-sku-value">{p.sku || "N/A"}</span>
      </p>

      {/* Sale Duration Countdown */}
      <CountdownBadge
        daysLeft={p.discount_days_left}
        durationDays={p.discount_duration_days}
        expiresAt={p.discount_expires_at}
        type={p.discount_type}
      />

      <div className="flex items-end justify-between mb-3 mt-3">
        <div>
          <p className="text-xs deal-price-original line-through">₹{p.price.toFixed(0)}</p>
          <p className="text-2xl font-black" style={{ color: cfg.badge }}>₹{discountedPrice.toFixed(0)}</p>
          <p className="text-xs font-semibold text-[#22C55E] mt-0.5">Save ₹{savings.toFixed(0)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] deal-stock-label uppercase font-semibold">Stock</p>
          <p className="text-lg font-bold deal-card-stock">{p.stock}</p>
        </div>
      </div>

      <div className="rounded-xl py-2 text-center text-xs font-bold deal-tier-badge"
        style={{ border: `1px solid ${cfg.border}`, color: cfg.badge }}>
        {cfg.label}
      </div>

      {p.discount_reason && (
        <p className="mt-2 text-[10px] deal-reason italic text-center">💡 {p.discount_reason}</p>
      )}
    </div>
  );
}

export default function Deals() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage]     = useState("");
  const [msgType, setMsgType]     = useState("ok");
  const [filterPct, setFilterPct] = useState("all");
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => { refreshAndFetch(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/inventory");
      setProducts(res.data.products || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const refreshAndFetch = async () => {
    setRefreshing(true);
    try {
      // Auto-expire/renew discounts on page load
      await axios.post("/refresh-discounts");
    } catch (_) { /* silent */ }
    finally { setRefreshing(false); }
    await fetchAll();
  };

  const flash = (msg, type = "ok") => {
    setMessage(msg); setMsgType(type);
    setTimeout(() => setMessage(""), 6000);
  };

  const applyDiscounts = async () => {
    setApplying(true);
    try {
      const res = await axios.post("/apply-discounts");
      const s = res.data.summary || {};
      const parts = [];
      if (s["70_pct"]) parts.push(`${s["70_pct"]} at 70% (Mega Clearance)`);
      if (s["50_pct"]) parts.push(`${s["50_pct"]} at 50% (Hot Clearance)`);
      if (s["30_pct"]) parts.push(`${s["30_pct"]} at 30% (30 Day Special)`);
      if (s["15_pct"]) parts.push(`${s["15_pct"]} at 15% (Weekend Deal)`);
      const detail = parts.length ? ` — ${parts.join(", ")}` : "";
      flash(`✓ ${res.data.applied_to?.length || 0} products discounted${detail}`);
      await fetchAll();
    } catch { flash("Failed to apply discounts.", "err"); }
    finally { setApplying(false); }
  };

  const discounted = products.filter(p => (p.discount_pct ?? 0) > 0);

  // Build unique tiers from actual data
  const uniquePcts = [...new Set(discounted.map(p => p.discount_pct))].sort((a, b) => b - a);
  const grouped    = groupByDiscount(discounted);
  const totalSavings = discounted.reduce((s, p) => s + p.price * p.discount_pct / 100, 0);

  // Filter tabs
  const filterTabs = [
    { id: "all", label: "🛍️ All Deals", count: discounted.length, color: "#4F7CFF" },
    ...uniquePcts.map(pct => {
      const cfg = getTierConfig(pct);
      return { id: String(pct), label: `${pct}% OFF`, count: discounted.filter(p => p.discount_pct === pct).length, color: cfg.badge };
    }),
  ];

  const filtered = filterPct === "all"
    ? discounted
    : discounted.filter(p => String(p.discount_pct) === filterPct);

  const filteredGrouped = filterPct === "all" ? grouped : grouped.filter(g => String(g.pct) === filterPct);

  const tier70 = discounted.filter(p => p.discount_pct === 70).length;
  const tier50 = discounted.filter(p => p.discount_pct === 50).length;
  const tier30 = discounted.filter(p => p.discount_pct === 30).length;
  const tier15 = discounted.filter(p => p.discount_pct === 15).length;

  // How many have urgent expiry (≤ 3 days left)
  const urgentExpiry = discounted.filter(p => p.discount_days_left !== null && p.discount_days_left !== undefined && p.discount_days_left <= 3 && p.discount_days_left > 0).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 relative z-10">

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
              <h1 className="text-3xl font-black deals-heading mb-1">Deals &amp; Discounts</h1>
              <p className="deals-subheading text-sm">AI-powered category-wise discounts · Sale duration timers · Live pricing</p>
              {urgentExpiry > 0 && (
                <p className="text-xs font-bold text-[#E11D48] mt-1 animate-pulse">
                  🔥 {urgentExpiry} deal{urgentExpiry !== 1 ? "s" : ""} expiring in ≤ 3 days!
                </p>
              )}
              {message && (
                <p className={`text-sm mt-2 font-bold px-3 py-1.5 rounded-lg inline-block ${
                  msgType === "err"
                    ? "bg-red-100 text-red-700 border border-red-300"
                    : "bg-green-100 text-green-700 border border-green-300"
                }`}>{message}</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={refreshAndFetch} disabled={refreshing || loading}
              className="px-4 py-3 rounded-xl font-bold deals-refresh-btn shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-60">
              {refreshing ? "⏳" : "🔄"} Refresh
            </button>
            <button onClick={() => setShowCustomModal(true)} disabled={loading}
              className="px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60 bg-gradient-to-r from-indigo-500 to-purple-600">
              ➕ Create Custom Deal
            </button>
            <button onClick={applyDiscounts} disabled={applying}
              className="px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #E11D48, #BE123C)" }}>
              {applying ? "Analyzing…" : "🤖 Apply AI Discounts"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill icon="🏷️" label="Discounted Products"  value={discounted.length}             color="#E11D48" bg="var(--deal-red-bg)"    border="var(--deal-red-border)"    />
        <StatPill icon="🔥" label="Mega Clearance (70%)" value={`${tier70} products`}          color="#BE123C" bg="var(--deal-red-bg)"    border="var(--deal-red-border)"    />
        <StatPill icon="⚡" label="Hot Clearance (50%)"  value={`${tier50} products`}          color="#EA580C" bg="var(--deal-orange-bg)" border="var(--deal-orange-border)" />
        <StatPill icon="💰" label="Total Savings Value"  value={`₹${totalSavings.toFixed(0)}`} color="#22C55E" bg="var(--deal-green-bg)"  border="var(--deal-green-border)"  />
      </div>

      {/* Tier breakdown summary */}
      {discounted.length > 0 && (
        <div className="glass-panel p-5">
          <p className="deals-section-label uppercase tracking-wider mb-3">Discount Breakdown by Tier</p>
          <div className="flex flex-wrap gap-3">
            {uniquePcts.map(pct => {
              const cfg = getTierConfig(pct);
              const cnt = discounted.filter(p => p.discount_pct === pct).length;
              return (
                <div key={pct} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
                  style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.text }}>
                  <span className="px-2 py-0.5 rounded-lg text-white text-xs font-black"
                    style={{ background: cfg.badge }}>{pct}%</span>
                  <span>{cfg.label} — {cnt} product{cnt !== 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(t => (
          <button key={t.id} onClick={() => setFilterPct(t.id)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
            style={filterPct === t.id
              ? { background: t.color, color: "white", boxShadow: `0 4px 14px ${t.color}40` }
              : undefined}
            data-active={filterPct !== t.id ? "true" : undefined}
            id={`deals-filter-${t.id}`}>
            {t.label}
            <span className="text-xs px-2 py-0.5 rounded-full font-black"
              style={filterPct === t.id
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
          <h3 className="text-xl font-bold deals-heading">No Active Deals</h3>
          <p className="deals-empty-text text-sm max-w-sm">
            Click <strong>"Apply AI Discounts"</strong> to let the AI analyze your inventory
            category-wise and auto-apply discounts (15% → 30% → 50% → 70%) to slow-moving
            excess stock only. Sale durations: 15-day or 30-day timers per tier.
          </p>
        </div>
      ) : (
        <div>
          {filteredGrouped.map(({ pct, items }) => (
            <div key={pct}>
              <DiscountGroupHeader pct={pct} count={items.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(p => <DiscountCard key={p.id} p={p} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCustomModal && (
        <CustomDealModal 
          products={products} 
          onClose={() => setShowCustomModal(false)} 
          onSuccess={async () => {
            setShowCustomModal(false);
            await refreshAndFetch();
            flash("Custom deal created successfully!");
          }}
        />
      )}
    </div>
  );
}

/* ── Custom Deal Creation Modal ────────────────────────────────────────── */
function CustomDealModal({ products, onClose, onSuccess }) {
  const [selectedId, setSelectedId] = useState(products[0]?.id || "");
  const [discountPct, setDiscountPct] = useState(20);
  const [durationType, setDurationType] = useState("manual"); // manual | auto
  const [durationDays, setDurationDays] = useState(30);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      setError("Please select a product.");
      return;
    }
    setSubmitting(true);
    setError("");
    const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const getToken = () => localStorage.getItem("supply_token") || "";
    try {
      await axios.post(`${API}/inventory/${selectedId}/discount`, {
        discount_pct: Number(discountPct),
        reason: reason,
        duration_type: durationType,
        duration_days: Number(durationDays)
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create deal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="glass-panel-strong w-full max-w-md p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-bold text-lg text-[#1E293B]">➕ Create Custom Deal</h3>
            <p className="text-xs text-[#94A3B8]">Apply custom discount percentage and duration</p>
          </div>
          <button onClick={onClose} className="text-2xl text-[#94A3B8] hover:text-[#1E293B]">✕</button>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          {error && (
            <p className="text-xs font-bold text-red-500 bg-red-100 p-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-1">Select Product</label>
            <select
              className="input-grocery w-full bg-[#0B0F14] py-3 text-sm"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="">-- Choose a product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock} · ₹{p.price})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 px-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Discount Percentage</label>
              <span className="text-sm font-bold text-indigo-500">{discountPct}% OFF</span>
            </div>
            <input
              type="range"
              min="1"
              max="90"
              value={discountPct}
              onChange={e => setDiscountPct(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 focus:outline-none"
              style={{ accentColor: "#4F7CFF" }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-1">Duration Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDurationType("auto")}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  durationType === "auto"
                    ? "bg-indigo-500 border-transparent text-white shadow-md shadow-indigo-500/20"
                    : "bg-[#0B0F14] border-[rgba(0,0,0,0.08)] text-[#94A3B8] hover:bg-[rgba(0,0,0,0.02)]"
                }`}
              >
                🤖 AI Calculated
              </button>
              <button
                type="button"
                onClick={() => setDurationType("manual")}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  durationType === "manual"
                    ? "bg-indigo-500 border-transparent text-white shadow-md shadow-indigo-500/20"
                    : "bg-[#0B0F14] border-[rgba(0,0,0,0.08)] text-[#94A3B8] hover:bg-[rgba(0,0,0,0.02)]"
                }`}
              >
                ✍️ Custom Days
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1.5 px-1 italic">
              {durationType === "auto" 
                ? "AI calculates dynamic clearance days based on excess stock levels and velocity."
                : "Enter your own custom sale duration in days."}
            </p>
          </div>

          {durationType === "manual" && (
            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Custom Duration (Days)</label>
                <span className="text-sm font-bold text-indigo-500">{durationDays} days</span>
              </div>
              <input
                type="range"
                min="1"
                max="90"
                value={durationDays}
                onChange={e => setDurationDays(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 focus:outline-none"
                style={{ accentColor: "#4F7CFF" }}
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-1">Reason (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Festival clearance sale..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="input-grocery w-full py-3 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-white border border-[#E8EDFF] text-[#475569] hover:bg-[#F8FAFC] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Apply Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
