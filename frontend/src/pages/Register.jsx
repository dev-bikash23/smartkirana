import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";

export default function Register() {
  const [name,     setName]     = useState("");
  const [shopName, setShopName] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const { register } = useAuth();
  const navigate     = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register({ name, shopName, email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  const strengthScore = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "#EF4444", "#F59E0B", "#10B981", "#059669"];

  return (
    <div className="auth-page">
      {/* ── Left Brand Panel ── */}
      <div className="auth-brand-panel hidden md:flex" style={{ flex: "0 0 38%" }}>
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%" }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "rgba(255,255,255,0.14)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(255,255,255,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}>
            <img src="/logo.png" alt="SmartKirana" style={{ width: 56, height: 56, objectFit: "contain" }} />
          </div>

          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>SmartKirana</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: "0 0 36px" }}>
            Join 1000+ kirana shop owners
          </p>

          {/* Steps */}
          {[
            { step: "1", title: "Create your account", desc: "Free forever, no credit card needed" },
            { step: "2", title: "Add your products",   desc: "Import CSV or add manually" },
            { step: "3", title: "Let AI do the work",  desc: "Forecasts, discounts & alerts — automated" },
          ].map(s => (
            <div key={s.step} style={{ display: "flex", gap: 14, alignItems: "flex-start", textAlign: "left", marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 800, fontSize: 13,
              }}>
                {s.step}
              </div>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: "4px 0 2px" }}>{s.title}</p>
                <p style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, margin: 0 }}>{s.desc}</p>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 32, padding: "14px 18px", borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, margin: 0, lineHeight: 1.7 }}>
              🔒 Your data is fully encrypted and <strong style={{ color: "rgba(255,255,255,0.85)" }}>isolated per account</strong>. No other vendor can see your inventory.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-form-panel animate-auth-in" style={{ flex: 1 }}>
        <div style={{ maxWidth: 460, width: "100%", margin: "0 auto" }}>

          {/* Mobile logo */}
          <div className="md:hidden text-center mb-7">
            <div style={{
              width: 60, height: 60, borderRadius: 18, margin: "0 auto 10px",
              background: "linear-gradient(135deg, #059669, #10B981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 18px rgba(5,150,105,0.32)", overflow: "hidden",
            }}>
              <img src="/logo.png" alt="SmartKirana" style={{ width: 42, height: 42, objectFit: "contain" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#064E3B", margin: 0 }}>SmartKirana</h1>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#064E3B", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
              Create your account 🚀
            </h2>
            <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
              Start managing your kirana smarter today
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Name + Shop Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
                  Your Full Name
                </label>
                <div className="input-icon-wrap">
                  <span className="icon">👤</span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input-grocery"
                    placeholder="Enter your full name"
                    style={{ paddingLeft: "2.8rem", width: "100%" }}
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
                  Shop Name
                </label>
                <div className="input-icon-wrap">
                  <span className="icon">🏪</span>
                  <input
                    type="text"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    className="input-grocery"
                    placeholder="Enter your shop name"
                    style={{ paddingLeft: "2.8rem", width: "100%" }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
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
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
                Create Password
              </label>
              <div className="input-icon-wrap" style={{ position: "relative" }}>
                <span className="icon">🔒</span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-grocery"
                  placeholder="Create a strong password (min. 6 chars)"
                  style={{ paddingLeft: "2.8rem", paddingRight: "3rem", width: "100%" }}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 15, opacity: 0.5,
                    padding: 0,
                  }}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 4,
                        background: i <= strengthScore ? strengthColor[strengthScore] : "#E5E7EB",
                        transition: "background 0.2s",
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: strengthColor[strengthScore], margin: 0, fontWeight: 600 }}>
                    {strengthLabel[strengthScore]} password
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-grocery-primary"
              style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 4, borderRadius: 14 }}
            >
              {loading
                ? <span style={{ width: 20, height: 20, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                : "Create Account →"}
            </button>
          </form>

          {/* Sign in link */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ color: "#9CA3AF", fontSize: 13 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>
                Sign In →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
