import { useState, useEffect } from "react";
import axios from "axios";

// ─── Discount Tier Configs ─────────────────────────────────────────────────
const TIER_CONFIGS = [
  { pct: 70, label: "Mega Clearance 🔥",  bg: "var(--deal-red-bg)",    border: "var(--deal-red-border)",    text: "var(--deal-red-text)",    badge: "#E11D48" },
  { pct: 50, label: "Hot Clearance ⚡",   bg: "var(--deal-orange-bg)", border: "var(--deal-orange-border)", text: "var(--deal-orange-text)", badge: "#EA580C" },
  { pct: 30, label: "Special Sale 💫",    bg: "var(--deal-yellow-bg)", border: "var(--deal-yellow-border)", text: "var(--deal-yellow-text)", badge: "#D97706" },
  { pct: 15, label: "Weekend Deal 🌟",    bg: "var(--deal-green-bg)",  border: "var(--deal-green-border)",  text: "var(--deal-green-text)",  badge: "#16A34A" },
  { pct: 0,  label: "Special Offer 🏷️",  bg: "var(--deal-green-bg)",  border: "var(--deal-green-border)",  text: "var(--deal-green-text)",  badge: "#16A34A" },
];

function getTierConfig(pct) {
  return TIER_CONFIGS.find(t => pct >= t.pct) || TIER_CONFIGS[TIER_CONFIGS.length - 1];
}

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

// ─── Format date as "3 Jun" ────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Countdown Badge with actual dates ────────────────────────────────────
function CountdownBadge({ daysLeft, durationDays, expiresAt, type }) {
  if (daysLeft === null || daysLeft === undefined) return null;

  const isExpired = daysLeft <= 0;
  const isUrgent  = daysLeft <= 3;

  // Compute start & end dates
  const endDate   = expiresAt ? new Date(expiresAt) : null;
  const startDate = endDate && durationDays
    ? new Date(endDate.getTime() - durationDays * 86400000)
    : null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {/* Date range pill */}
      {startDate && endDate && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: "2px 8px", borderRadius: 20,
          background: "rgba(79,124,255,0.10)", color: "#4F7CFF",
          border: "1px solid rgba(79,124,255,0.20)",
          letterSpacing: 0.3,
        }}>
          📅 {fmtDate(startDate)} → {fmtDate(endDate)}
        </span>
      )}
      {/* Days remaining */}
      <span style={{
        fontSize: 10, fontWeight: 800,
        padding: "2px 8px", borderRadius: 20,
        background: isExpired ? "#FEE2E2" : isUrgent ? "#FFF7ED" : "#F0FDF4",
        color:      isExpired ? "#DC2626"  : isUrgent ? "#EA580C" : "#16A34A",
        border: `1px solid ${isExpired ? "#FECACA" : isUrgent ? "#FED7AA" : "#BBF7D0"}`,
      }}>
        {isExpired ? "⚠️ Expired" : isUrgent ? `🔥 ${daysLeft}d left!` : `✅ ${daysLeft} days left`}
      </span>
      {type === "manual" && (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 20,
          background: "#F3E8FF", color: "#7C3AED", border: "1px solid #DDD6FE",
        }}>CUSTOM</span>
      )}
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

  // Compute end date label for badge
  const endDate = p.discount_expires_at ? new Date(p.discount_expires_at) : null;
  const durationLabel = p.discount_duration_days
    ? `${p.discount_duration_days}-Day Sale`
    : "Sale";

  return (
    <div className="deal-card rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-default"
      style={{ borderColor: cfg.border, boxShadow: `0 4px 20px ${cfg.border}` }}>

      {/* Top row: icon + discount badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm deal-card-icon"
          style={{ border: `1px solid ${cfg.border}` }}>
          {p.image || "📦"}
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
          style={{ background: cfg.badge }}>
          {p.discount_pct}% OFF
        </span>
      </div>

      {/* Product info */}
      <h3 className="text-base font-bold truncate mb-0.5 deal-card-name" style={{ color: cfg.text }}>{p.name}</h3>
      <p className="deal-card-category text-xs mb-0.5">{p.category}</p>
      <p className="text-[10px] font-mono font-bold deal-card-sku mb-2 tracking-wider">
        SKU: <span className="deal-card-sku-value">{p.sku || "N/A"}</span>
      </p>

      {/* Sale duration label */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 8, padding: "3px 10px", marginBottom: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.text }}>⏱ {durationLabel}</span>
      </div>

      {/* Date range + countdown */}
      <CountdownBadge
        daysLeft={p.discount_days_left}
        durationDays={p.discount_duration_days}
        expiresAt={p.discount_expires_at}
        type={p.discount_type}
      />

      {/* Pricing */}
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
      if (s["70_pct"]) parts.push(`${s["70_pct"]} at 70%`);
      if (s["50_pct"]) parts.push(`${s["50_pct"]} at 50%`);
      if (s["30_pct"]) parts.push(`${s["30_pct"]} at 30%`);
      if (s["15_pct"]) parts.push(`${s["15_pct"]} at 15%`);
      const detail = parts.length ? ` — ${parts.join(", ")}` : "";
      flash(`✓ ${res.data.applied_to?.length || 0} products discounted${detail}`);
      await fetchAll();
    } catch { flash("Failed to apply discounts.", "err"); }
    finally { setApplying(false); }
  };

  const discounted = products.filter(p => (p.discount_pct ?? 0) > 0);
  const uniquePcts = [...new Set(discounted.map(p => p.discount_pct))].sort((a, b) => b - a);
  const grouped    = groupByDiscount(discounted);
  const totalSavings = discounted.reduce((s, p) => s + p.price * p.discount_pct / 100, 0);

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
              <p className="deals-subheading text-sm">Custom deals with exact start → end dates · AI auto-discounts · Live pricing</p>
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
          <h3 className="text-xl font-bold deals-heading">No Active Deals Yet</h3>
          <p className="deals-empty-text text-sm max-w-sm">
            Click <strong>「➕ Create Custom Deal」</strong> to set a discount on any product.
            AI-based discounts are applied automatically in the background whenever slow-moving
            excess stock is detected.
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

/* ── Custom Deal Creation Modal (Premium Redesign) ─────────────────────── */
const DISCOUNT_PRESETS = [10, 15, 20, 25, 30, 40, 50, 70];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function dateDiff(start, end) {
  const a = new Date(start), b = new Date(end);
  return Math.max(1, Math.round((b - a) / 86400000));
}

function CustomDealModal({ products, onClose, onSuccess }) {
  const [selectedId,  setSelectedId]  = useState(products[0]?.id || "");
  const [discountPct, setDiscountPct] = useState(20);
  const [customPct,   setCustomPct]   = useState("");   // typed custom %
  const [startDate,   setStartDate]   = useState(todayStr());
  const [endDate,     setEndDate]     = useState(daysFromToday(7));
  const [reason,      setReason]      = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  const durationDays = dateDiff(startDate, endDate);
  const selectedProduct = products.find(p => p.id === selectedId);
  const discountedPrice = selectedProduct
    ? (selectedProduct.price * (1 - discountPct / 100)).toFixed(2)
    : null;

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedId) { setError("Please select a product."); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError("End date must be after start date."); return; }
    setSubmitting(true);
    setError("");
    try {
      await axios.post(`/inventory/${selectedId}/discount`, {
        discount_pct: Number(discountPct),
        reason,
        duration_type: "manual",
        duration_days: durationDays,
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("supply_token") || ""}` }
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create deal.");
    } finally {
      setSubmitting(false);
    }
  };

  const setPreset = (pct) => {
    setDiscountPct(pct);
    setCustomPct("");
  };

  const handleCustomPct = (val) => {
    setCustomPct(val);
    const n = Number(val);
    if (n >= 1 && n <= 90) setDiscountPct(n);
  };

  // Quick duration presets
  const durationPresets = [
    { label: "3 days",  days: 3 },
    { label: "7 days",  days: 7 },
    { label: "14 days", days: 14 },
    { label: "21 days", days: 21 },
  ];

  const setDurationPreset = (days) => {
    setStartDate(todayStr());
    setEndDate(daysFromToday(days));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        width: "100%", maxWidth: 480,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
        animation: "fadeInUp 0.25s ease",
      }} onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={{
          background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
          borderRadius: "24px 24px 0 0",
          padding: "22px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>➕ Create Custom Deal</h3>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, margin: "3px 0 0" }}>
              Set discount, pick exact sale dates &amp; duration
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)", border: "none",
            color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700,
          }}>✕</button>
        </div>

        <form onSubmit={handleApply} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
              padding: "10px 14px", color: "#DC2626", fontSize: 13, fontWeight: 600,
            }}>⚠️ {error}</div>
          )}

          {/* Product selector */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Select Product
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1.5px solid #E5E7EB", fontSize: 14, fontWeight: 600,
                background: "#F9FAFB", color: "#1F2937", outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">-- Choose a product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} · Stock: {p.stock} · ₹{p.price}
                </option>
              ))}
            </select>
          </div>

          {/* Discount % — preset buttons */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1 }}>
                Discount Percentage
              </label>
              <span style={{
                fontSize: 20, fontWeight: 900, color: "#4F46E5",
                background: "#EEF2FF", padding: "2px 14px", borderRadius: 12,
                border: "1.5px solid #C7D2FE",
              }}>{discountPct}% OFF</span>
            </div>

            {/* Preset buttons grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
              {DISCOUNT_PRESETS.map(pct => {
                const isSelected = discountPct === pct && !customPct;
                const color = pct >= 50 ? "#E11D48" : pct >= 30 ? "#D97706" : "#4F46E5";
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPreset(pct)}
                    style={{
                      padding: "10px 4px",
                      borderRadius: 12,
                      border: isSelected ? `2px solid ${color}` : "1.5px solid #E5E7EB",
                      background: isSelected ? color : "#F9FAFB",
                      color: isSelected ? "#fff" : "#374151",
                      fontWeight: 800, fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      boxShadow: isSelected ? `0 4px 12px ${color}40` : "none",
                    }}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {/* Custom % input */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                min={1} max={90}
                placeholder="Custom %"
                value={customPct}
                onChange={e => handleCustomPct(e.target.value)}
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 10,
                  border: customPct ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
                  fontSize: 13, fontWeight: 600, outline: "none",
                  background: "#F9FAFB",
                }}
              />
              <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>% (1–90)</span>
            </div>

            {/* Preview price */}
            {discountedPrice && selectedProduct && (
              <div style={{
                marginTop: 10, padding: "10px 14px", borderRadius: 12,
                background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)",
                border: "1px solid #BBF7D0",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>
                  💰 Sale price for <strong>{selectedProduct.name}</strong>
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "#16A34A" }}>
                  <s style={{ color: "#9CA3AF", fontWeight: 500, fontSize: 12 }}>₹{selectedProduct.price}</s>
                  {" "}₹{discountedPrice}
                </span>
              </div>
            )}
          </div>

          {/* Sale Dates */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              Sale Duration — Exact Dates
            </label>

            {/* Quick duration presets */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {durationPresets.map(({ label, days }) => {
                const isActive = dateDiff(startDate, endDate) === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationPreset(days)}
                    style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      border: isActive ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
                      background: isActive ? "#4F46E5" : "#F9FAFB",
                      color: isActive ? "#fff" : "#374151",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 5 }}>📅 Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={todayStr()}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600,
                    outline: "none", background: "#F9FAFB", color: "#1F2937",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF", marginBottom: 5 }}>🏁 End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || todayStr()}
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10,
                    border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 600,
                    outline: "none", background: "#F9FAFB", color: "#1F2937",
                  }}
                />
              </div>
            </div>

            {/* Duration summary */}
            <div style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 12,
              background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
              border: "1px solid #C7D2FE",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 12, color: "#4338CA", fontWeight: 600 }}>
                📅 {fmtDate(startDate)} → {fmtDate(endDate)}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 900, color: "#4338CA",
                background: "#C7D2FE", padding: "2px 10px", borderRadius: 10,
              }}>
                {durationDays} {durationDays === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Festival clearance sale, Expiry clearance…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 12,
                border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 500,
                outline: "none", background: "#F9FAFB", color: "#1F2937",
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "13px", borderRadius: 14, fontSize: 14, fontWeight: 700,
                border: "1.5px solid #E5E7EB", background: "#F9FAFB", color: "#374151",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedId}
              style={{
                flex: 2, padding: "13px", borderRadius: 14, fontSize: 14, fontWeight: 800,
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "#fff", border: "none", cursor: "pointer",
                boxShadow: "0 6px 20px rgba(79,70,229,0.35)",
                opacity: submitting || !selectedId ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {submitting ? "⏳ Saving…" : `🚀 Apply ${discountPct}% Deal · ${durationDays}d`}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
