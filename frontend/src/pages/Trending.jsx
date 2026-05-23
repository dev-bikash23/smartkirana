import { useState, useEffect } from "react";
import axios from "axios";
import AlertBanner from "../components/AlertBanner";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function DiscountBadge({ pct }) {
  const color = pct >= 70 ? { bg: "var(--deal-red-bg)",    text: "#BE123C", border: "var(--deal-red-border)" }
              : pct >= 50 ? { bg: "var(--deal-orange-bg)", text: "#C2410C", border: "var(--deal-orange-border)" }
              : pct >= 30 ? { bg: "var(--deal-yellow-bg)", text: "#B45309", border: "var(--deal-yellow-border)" }
              :              { bg: "var(--deal-green-bg)",  text: "#15803D", border: "var(--deal-green-border)" };
  return (
    <span className="px-3 py-1.5 rounded-xl font-black text-base border"
      style={{ background: color.bg, color: color.text, border: `1.5px solid ${color.border}` }}>
      {pct}% OFF
    </span>
  );
}

function SaleDurationBadge({ daysLeft, durationDays, type }) {
  if (daysLeft === null || daysLeft === undefined) return null;
  const isExpired = daysLeft <= 0;
  const isUrgent  = daysLeft > 0 && daysLeft <= 3;
  const label     = durationDays === 15 ? "15-Day Sale" : durationDays === 30 ? "30-Day Sale" : durationDays ? `${durationDays}-Day Sale` : "Limited Sale";

  return (
    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full deal-sale-label">
        ⏱ {label}{type === "manual" ? " (Custom)" : ""}
      </span>
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
        isExpired ? "deal-expired-badge" :
        isUrgent  ? "deal-urgent-badge"  :
                    "deal-timer-badge"
      }`}>
        {isExpired ? "⚠️ Expired" : isUrgent ? `🔥 ${daysLeft}d left!` : `${daysLeft} days left`}
      </span>
    </div>
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
      // Refresh discounts (expire/renew) first
      await axios.post(`${API}/refresh-discounts`).catch(() => {});
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

  // Urgent expiry count
  const urgentCount = (data?.discounted_products || []).filter(
    p => p.discount_days_left !== null && p.discount_days_left !== undefined && p.discount_days_left > 0 && p.discount_days_left <= 3
  ).length;

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
              <h1 className="text-3xl font-black trending-heading mb-1">AI Analyst &amp; Trending</h1>
              <p className="trending-subheading text-sm">{data?.ai_insight || "Analyzing market demand…"}</p>
              {urgentCount > 0 && (
                <p className="text-xs font-bold text-[#E11D48] mt-1 animate-pulse">
                  🔥 {urgentCount} deal{urgentCount !== 1 ? "s" : ""} expiring in ≤ 3 days!
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
          <div className="flex gap-3">
            <button onClick={loadAll} disabled={loading}
              className="px-4 py-3 rounded-xl font-bold deals-refresh-btn shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-60">
              🔄 Refresh
            </button>
            <button onClick={applyDiscounts} disabled={applying}
              className="px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #E11D48, #BE123C)" }}>
              {applying ? "Analyzing…" : "🤖 Auto-Apply Discounts"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Active Discounts", value: data?.discounted_products?.length ?? 0, icon: "🏷️", bg: "var(--deal-red-bg)",   border: "var(--deal-red-border)",  color: "#E11D48" },
          { label: "Top Selling",      value: data?.top_selling?.length ?? 0,         icon: "🔥", bg: "#EFF6FF",              border: "#BFDBFE",                 color: "#2563EB" },
          { label: "Excess Stock",     value: data?.dead_stock?.length ?? 0,          icon: "📦", bg: "var(--deal-red-bg)",   border: "var(--deal-red-border)",  color: "#BE123C" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-5 flex items-center gap-4 animate-fade-in-up"
            style={{ borderColor: s.border, animationDelay: `${i * 0.08}s` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs trending-stat-label font-semibold uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Discount Offers Section */}
      <div className="glass-panel p-6" style={{ borderColor: "var(--deal-red-border)" }}>
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2 trending-section-title">
          <span className="w-2 h-6 rounded-full" style={{ background: "#E11D48" }} />
          Active Discount Offers
        </h2>
        <p className="text-xs trending-section-sub mb-4">
          Auto &amp; custom discounts — category-wise excess stock analysis with sale timers
        </p>

        {!data?.discounted_products?.length ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <span className="text-5xl opacity-30">🏷️</span>
            <p className="text-sm trending-empty italic text-center">
              No active discounts.<br />Click "Auto-Apply Discounts" to analyze category-wise excess stock.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.discounted_products.map((p, i) => {
              const original = allProducts.find(a => a.name === p.name);
              const origPrice = original?.price ?? p.price ?? 0;
              const discounted = origPrice * (1 - p.discount_pct / 100);
              const tierLabel = p.discount_pct >= 70 ? "Mega Clearance 🔥"
                              : p.discount_pct >= 50 ? "Hot Clearance ⚡"
                              : p.discount_pct >= 30 ? "30 Day Special 💫"
                              :                        "Weekend Deal 🌟";
              return (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl transition-all hover:shadow-md trending-discount-row"
                  style={{ border: "1.5px solid var(--deal-red-border)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold trending-product-name truncate">{p.name}</p>
                      {/* Tier label */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: p.discount_pct >= 70 ? "var(--deal-red-bg)" :
                                      p.discount_pct >= 50 ? "var(--deal-orange-bg)" :
                                      p.discount_pct >= 30 ? "var(--deal-yellow-bg)" : "var(--deal-green-bg)",
                          color: p.discount_pct >= 70 ? "#BE123C" :
                                 p.discount_pct >= 50 ? "#C2410C" :
                                 p.discount_pct >= 30 ? "#B45309" : "#15803D",
                          border: `1px solid ${p.discount_pct >= 70 ? "var(--deal-red-border)" :
                                              p.discount_pct >= 50 ? "var(--deal-orange-border)" :
                                              p.discount_pct >= 30 ? "var(--deal-yellow-border)" : "var(--deal-green-border)"}`,
                        }}>
                        {tierLabel}
                      </span>
                      {/* Type badge */}
                      {p.discount_type === "manual" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE" }}>
                          Custom
                        </span>
                      )}
                    </div>
                    {/* Category */}
                    <p className="text-[10px] trending-product-cat mt-0.5">{p.category}</p>
                    {original && (
                      <p className="text-[10px] font-mono trending-sku mt-0.5">
                        SKU: {original.sku || "N/A"}
                      </p>
                    )}
                    <p className="text-xs text-[#E11D48] mt-0.5 truncate">{p.reason}</p>
                    {/* Sale duration timer */}
                    <SaleDurationBadge
                      daysLeft={p.discount_days_left}
                      durationDays={p.discount_duration_days}
                      type={p.discount_type}
                    />
                    {origPrice > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs trending-price-orig line-through">₹{origPrice.toFixed(0)}</span>
                        <span className="text-sm font-bold text-[#16A34A]">₹{discounted.toFixed(0)}</span>
                        <span className="text-xs trending-price-save">saves ₹{(origPrice - discounted).toFixed(0)}</span>
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

      {/* Row: Top Selling + Excess Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Selling */}
        <div className="glass-panel p-6" style={{ borderColor: "#BFDBFE" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 trending-section-title">
            <span className="w-2 h-6 rounded-full" style={{ background: "#2563EB" }} />
            Top Selling
            <span className="text-xs font-normal trending-section-sub ml-1">(Low Stock Warning)</span>
          </h2>
          {!data?.top_selling?.length ? (
            <p className="trending-empty text-sm italic py-6 text-center">All products have sufficient stock.</p>
          ) : (
            <div className="space-y-2">
              {data.top_selling.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl transition-all trending-row-hover">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black trending-rank w-5">#{i + 1}</span>
                    <span className="trending-product-name font-semibold text-sm">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${p.stock < 20 ? "text-red-500" : "text-[#2563EB]"}`}>
                      {p.stock} units
                    </span>
                    {p.stock < 20 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "var(--deal-red-bg)", color: "#BE123C", border: "1px solid var(--deal-red-border)" }}>
                        Reorder
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Excess / Dead Stock */}
        <div className="glass-panel p-6" style={{ borderColor: "var(--deal-red-border)" }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 trending-section-title">
            <span className="w-2 h-6 rounded-full" style={{ background: "#BE123C" }} />
            Excess Stock
            <span className="text-xs font-normal trending-section-sub ml-1">(Action Required)</span>
          </h2>
          {!data?.dead_stock?.length ? (
            <p className="trending-empty text-sm italic py-6 text-center">No excess stock identified. 🎉</p>
          ) : (
            <div className="space-y-2">
              {data.dead_stock.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl transition-all trending-row-hover">
                  <span className="trending-product-name font-semibold text-sm">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 text-sm font-bold">{p.stock} units</span>
                    {p.discount > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "var(--deal-orange-bg)", color: "#C2410C", border: "1px solid var(--deal-orange-border)" }}>
                        {p.discount}% OFF
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "var(--deal-red-bg)", color: "#BE123C", border: "1px solid var(--deal-red-border)" }}>
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
