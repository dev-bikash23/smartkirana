import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";

const features = [
  { icon: "🧠", title: "AI Demand Forecast", desc: "7-day prediction powered by GRU neural networks" },
  { icon: "📦", title: "Smart Inventory",    desc: "Real-time stock tracking & auto-refill alerts" },
  { icon: "🏷️", title: "Auto Discounting",   desc: "AI applies discounts to clear slow-moving stock" },
  { icon: "🧾", title: "GST-Ready Bills",    desc: "Instant tax invoices with GST breakdown" },
];

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* ── Left Brand Panel ── */}
      <div className="auth-brand-panel hidden md:flex" style={{ flex: "0 0 42%" }}>
        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%" }}>
          <div style={{
            width: 88, height: 88, borderRadius: 28,
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            overflow: "hidden",
          }}>
            <img src="/logo.png" alt="SmartKirana" style={{ width: 62, height: 62, objectFit: "contain" }} />
          </div>
          <h1 style={{ color: "#fff", fontSize: 30, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
            SmartKirana
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, margin: "0 0 40px" }}>
            AI-Powered Grocery Intelligence
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "left" }}>
            {features.map(f => (
              <div key={f.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: "0 0 2px" }}>{f.title}</p>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 40 }}>© 2026 SmartKirana</p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-form-panel animate-auth-in" style={{ flex: 1 }}>
        <div style={{ maxWidth: 420, width: "100%", margin: "0 auto" }}>

          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <div style={{
              width: 68, height: 68, borderRadius: 20, margin: "0 auto 12px",
              background: "linear-gradient(135deg, #059669, #10B981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 20px rgba(5,150,105,0.35)", overflow: "hidden",
            }}>
              <img src="/logo.png" alt="SmartKirana" style={{ width: 48, height: 48, objectFit: "contain" }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", margin: 0 }}>SmartKirana</h1>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#064E3B", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
              Welcome back 👋
            </h2>
            <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
              Sign in to manage your shop's inventory
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
              color: "#DC2626", fontSize: 13, fontWeight: 500,
              display: "flex", gap: 8, alignItems: "center",
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Email Address
              </label>
              <div className="input-icon-wrap">
                <span className="icon">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-grocery"
                  placeholder="Enter your email address"
                  style={{ paddingLeft: "2.8rem", width: "100%" }}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Password
              </label>
              <div className="input-icon-wrap" style={{ position: "relative" }}>
                <span className="icon">🔒</span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-grocery"
                  placeholder="Enter your password"
                  style={{ paddingLeft: "2.8rem", paddingRight: "3rem", width: "100%" }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 16, opacity: 0.5,
                    padding: 0,
                  }}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-grocery-primary"
              style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 6, borderRadius: 14 }}
            >
              {loading
                ? <span style={{ width: 20, height: 20, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                : "Sign In →"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span style={{ color: "#9CA3AF", fontSize: 12 }}>New to SmartKirana?</span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          <Link
            to="/register"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", padding: "13px", borderRadius: 14,
              border: "1.5px solid rgba(5,150,105,0.30)",
              background: "rgba(5,150,105,0.05)",
              color: "#059669", fontWeight: 700, fontSize: 14,
              textDecoration: "none", transition: "all 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(5,150,105,0.10)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(5,150,105,0.05)"; }}
          >
            Create a free account ✨
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
