import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth, useTheme } from "../App";
import axios from "axios";

const navLinks = [
  { to: "/",         label: "Home",      icon: "🏠", end: true },
  { to: "/inventory",label: "Inventory", icon: "📦" },
  { to: "/deals",    label: "Deals",     icon: "🛍️" },
  { to: "/trending", label: "Trending",  icon: "✨" },
  { to: "/orders",   label: "Orders",    icon: "🧾" },
  { to: "/test",     label: "AI Stock",  icon: "🧠" },
  { to: "/history",  label: "History",   icon: "📈" },
  { to: "/data",     label: "Database",  icon: "🗄️" },
];

/* ── Logo Preview Modal ──────────────────────────────────────────────── */
function LogoModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: "rgba(15,20,40,0.72)", backdropFilter: "blur(18px)" }}
      onClick={onClose}
    >
      <div
        className="relative animate-fade-in-up"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 380 }}
      >
        {/* Glow ring */}
        <div
          style={{
            position: "absolute", inset: -24, borderRadius: 52,
            background: "radial-gradient(circle, rgba(79,124,255,0.28) 0%, transparent 70%)",
            filter: "blur(20px)", pointerEvents: "none",
          }}
        />

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.10)",
            border: "1.5px solid rgba(255,255,255,0.22)",
            borderRadius: 36,
            padding: "40px 44px 32px",
            textAlign: "center",
            boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(79,124,255,0.2) inset",
            backdropFilter: "blur(32px)",
          }}
        >
          {/* Logo image with shimmer frame */}
          <div
            style={{
              width: 160, height: 160, borderRadius: 40, margin: "0 auto 24px",
              background: "linear-gradient(135deg, #4F7CFF 0%, #7C3AED 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 4px rgba(79,124,255,0.25), 0 20px 60px rgba(79,124,255,0.45)",
              overflow: "hidden", position: "relative",
            }}
          >
            {/* Shimmer sweep */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.4s ease-in-out infinite",
            }} />
            <img
              src="/logo.png"
              alt="SmartKirana"
              style={{ width: 118, height: 118, objectFit: "contain", position: "relative", zIndex: 1 }}
            />
          </div>

          {/* Brand name */}
          <h2 style={{
            margin: "0 0 6px",
            fontSize: 28, fontWeight: 800,
            background: "linear-gradient(135deg, #fff 0%, #C4D8FF 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}>
            SmartKirana
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, margin: "0 0 24px", letterSpacing: "0.5px" }}>
            AI-Powered Supply Chain Intelligence
          </p>

          {/* Tags */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
            {["🤖 AI Forecast", "📦 Inventory", "📊 Analytics", "🔒 Secure"].map(tag => (
              <span key={tag} style={{
                background: "rgba(79,124,255,0.18)", border: "1px solid rgba(79,124,255,0.32)",
                color: "#C4D8FF", borderRadius: 50, padding: "4px 14px", fontSize: 11, fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>© 2026 SmartKirana • v2.0</p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: -14, right: -14,
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(239,68,68,0.85)", border: "none",
            color: "#fff", fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── Navbar ──────────────────────────────────────────────────────────── */
export default function Navbar() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const { user, logout }              = useAuth();
  const { toggleTheme }               = useTheme();
  const [systemStatus, setSystemStatus] = useState("operational");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get("/system/status");
        setSystemStatus(res.data.status);
      } catch { setSystemStatus("offline"); }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 navbar-grocery">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Brand — logo click opens modal, text navigates home */}
          <div className="flex items-center gap-3">
            {/* Clickable logo icon → opens preview modal */}
            <button
              id="logo-preview-btn"
              onClick={() => setShowLogoModal(true)}
              title="View SmartKirana Logo"
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                borderRadius: 16, transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,124,255,0.25)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 42, height: 42, borderRadius: 14,
                  background: "linear-gradient(135deg, #4F7CFF 0%, #7C3AED 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(79,124,255,0.4)",
                  overflow: "hidden",
                }}
              >
                <img src="/logo.png" alt="SmartKirana Logo" style={{ width: 30, height: 30, objectFit: "contain" }} />
              </div>
            </button>

            {/* Brand name links to home */}
            <NavLink to="/" className="flex flex-col leading-none group">
              <span
                style={{
                  fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px",
                  color: "var(--text-heading)",
                }}
              >
                SmartKirana
              </span>
              <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                systemStatus === "operational" ? "text-[#22C55E]" : "text-red-500"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  systemStatus === "operational" ? "bg-[#22C55E]" : "bg-red-500"
                }`}/>
                {systemStatus === "operational" ? "AI Active" : "Offline"}
              </span>
            </NavLink>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-md"
                      : "text-[#065F46] hover:text-[#059669] hover:bg-[rgba(5,150,105,0.08)]"
                  }`
                }
              >
                <span>{link.icon}</span>{link.label}
              </NavLink>
            ))}

            <div className="h-6 w-px mx-2" style={{ background: "var(--border-card)" }}/>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle Theme"
              title="Switch Day/Night Mode"
            />

            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5 ml-1"
            >
              🚪 Logout
            </button>
          </nav>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-[rgba(79,124,255,0.08)] border border-[#E8EDFF]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className="text-xl">{mobileOpen ? "✕" : "☰"}</span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[#E8EDFF] bg-white/90 backdrop-blur-xl animate-fade-in-up">
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-2xl text-base font-semibold transition-all flex items-center gap-3 ${
                      isActive
                        ? "bg-gradient-to-r from-[#059669] to-[#10B981] text-white"
                        : "text-[#065F46] hover:bg-[rgba(5,150,105,0.08)]"
                    }`
                  }
                >
                  <span className="text-xl">{link.icon}</span>{link.label}
                </NavLink>
              ))}
              <div className="h-px w-full my-1" style={{ background: "var(--border-card)" }}/>
              <div className="flex items-center justify-between px-4 py-3">
                <span style={{ fontSize: 14, fontWeight: 600 }}>Theme</span>
                <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle Theme" />
              </div>
              <button
                onClick={logout}
                className="px-4 py-3 rounded-2xl text-base font-semibold text-red-500 flex items-center gap-3 hover:bg-red-500/10"
              >
                <span className="text-xl">🚪</span> Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Logo Preview Modal */}
      {showLogoModal && <LogoModal onClose={() => setShowLogoModal(false)} />}
    </>
  );
}
