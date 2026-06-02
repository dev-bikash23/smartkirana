import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import axios from "axios";

/* ── 6-box OTP Input ─────────────────────────────────────────────────── */
function OTPInput({ value, onChange }) {
  const r = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const digits = (value + "      ").slice(0, 6).split("");

  const handleChange = (i, e) => {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    onChange(next.join("").trim());
    if (ch && i < 5) r[i + 1].current?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      r[i - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    const idx = Math.min(pasted.length, 5);
    setTimeout(() => r[idx].current?.focus(), 0);
    e.preventDefault();
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }} onPaste={handlePaste}>
      {digits.map((d, i) => {
        const filled = d.trim() !== "";
        return (
          <input
            key={i}
            ref={r[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d.trim()}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKey(i, e)}
            style={{
              width: 48, height: 58,
              textAlign: "center",
              fontSize: 24, fontWeight: 800,
              border: `2px solid ${filled ? "#6C63FF" : "#E5E7EB"}`,
              borderRadius: 14,
              background: filled ? "#F4F3FF" : "#FAFAFA",
              color: "#1A1433",
              outline: "none",
              transition: "all 0.15s",
              caretColor: "transparent",
              fontFamily: "'Courier New', monospace",
              boxShadow: filled ? "0 0 0 3px rgba(108,99,255,0.15)" : "none",
            }}
            onFocus={e => { e.target.style.borderColor = "#6C63FF"; e.target.style.boxShadow = "0 0 0 3px rgba(108,99,255,0.20)"; }}
            onBlur={e  => { e.target.style.borderColor = filled ? "#6C63FF" : "#E5E7EB"; e.target.style.boxShadow = filled ? "0 0 0 3px rgba(108,99,255,0.15)" : "none"; }}
          />
        );
      })}
    </div>
  );
}

/* ── Password strength helper ────────────────────────────────────────── */
function getStrength(pw) {
  if (!pw) return 0;
  if (pw.length < 6) return 1;
  if (pw.length < 10) return 2;
  return /[A-Z]/.test(pw) && /[0-9]/.test(pw) ? 4 : 3;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "#EF4444", "#F59E0B", "#10B981", "#059669"];

/* ── Main Register Page ──────────────────────────────────────────────── */
export default function Register() {
  // Step 1 fields
  const [name,      setName]      = useState("");
  const [shopName,  setShopName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPwd,   setShowPwd]   = useState(false);

  // Step state
  const [step,      setStep]      = useState(1); // 1 = details, 2 = OTP
  const [otp,       setOtp]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [resendCD,  setResendCD]  = useState(0);  // countdown seconds

  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const cdRef = useRef(null);

  const startCountdown = () => {
    setResendCD(60);
    clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      setResendCD(s => {
        if (s <= 1) { clearInterval(cdRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  /* ── Step 1: Send OTP ───────────────────────────────────────────── */
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      await axios.post("/auth/send-otp", { name, shopName, email: email.trim().toLowerCase(), password });
      setStep(2);
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 2: Verify OTP ─────────────────────────────────────────── */
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.replace(/\s/g, "").length < 6) { setError("Please enter the 6-digit code."); return; }
    setLoading(true);
    try {
      const res = await axios.post("/auth/verify-otp", { email: email.trim().toLowerCase(), otp: otp.trim() });
      loginWithToken(res.data.access_token, res.data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Incorrect or expired OTP. Please try again.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ─────────────────────────────────────────────────── */
  const handleResend = async () => {
    if (resendCD > 0) return;
    setError("");
    setOtp("");
    setLoading(true);
    try {
      await axios.post("/auth/send-otp", { name, shopName, email: email.trim().toLowerCase(), password });
      startCountdown();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(password);

  /* ── Shared brand panel ─────────────────────────────────────────── */
  const BrandPanel = () => (
    <div className="auth-brand-panel hidden md:flex" style={{ flex: "0 0 40%" }}>
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%" }}>
        <div style={{
          width: 84, height: 84, borderRadius: 26,
          background: "rgba(255,255,255,0.14)", backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255,255,255,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden",
        }}>
          <img src="/logo.png" alt="SmartKirana" style={{ width: 58, height: 58, objectFit: "contain" }} />
        </div>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: "0 0 6px" }}>SmartKirana</h1>
        <p style={{ color: "rgba(255,255,255,0.60)", fontSize: 13, margin: "0 0 36px" }}>
          Join thousands of kirana owners
        </p>
        {[
          { step: "1", title: "Fill your details", desc: "Name, shop, email, and password" },
          { step: "2", title: "Verify your email", desc: "Enter the 6-digit OTP we send you" },
          { step: "3", title: "Start managing smarter", desc: "AI forecasts, deals & alerts — automated" },
        ].map(s => (
          <div key={s.step} style={{ display: "flex", gap: 14, alignItems: "flex-start", textAlign: "left", marginBottom: 20 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: step > Number(s.step) ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 13,
              transition: "background 0.3s",
            }}>
              {step > Number(s.step) ? "✓" : s.step}
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: "4px 0 2px" }}>{s.title}</p>
              <p style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, margin: 0 }}>{s.desc}</p>
            </div>
          </div>
        ))}
        <div style={{
          marginTop: 32, padding: "14px 18px", borderRadius: 14,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
        }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, margin: 0, lineHeight: 1.7 }}>
            🔒 Your data is fully <strong style={{ color: "rgba(255,255,255,0.85)" }}>encrypted and isolated per account</strong>. No other vendor can see your inventory.
          </p>
        </div>
      </div>
    </div>
  );

  /* ── STEP 1: Details Form ───────────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="auth-page">
        <BrandPanel />
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

            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
              {[1, 2].map(s => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: step >= s ? "#059669" : "#E5E7EB",
                    color: step >= s ? "#fff" : "#9CA3AF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 12, transition: "all 0.3s",
                  }}>{s}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: step >= s ? "#059669" : "#9CA3AF" }}>
                    {s === 1 ? "Your Details" : "Verify Email"}
                  </span>
                  {s < 2 && <div style={{ width: 28, height: 2, background: "#E5E7EB", borderRadius: 2 }} />}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#064E3B", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
                Create your account 🚀
              </h2>
              <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
                We'll send a 6-digit code to verify your email
              </p>
            </div>

            {error && (
              <div style={{
                background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
                padding: "12px 16px", marginBottom: 20, color: "#DC2626",
                fontSize: 13, fontWeight: 500, display: "flex", gap: 8, alignItems: "center",
              }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSendOTP} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Your Full Name</label>
                  <div className="input-icon-wrap">
                    <span className="icon">👤</span>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className="input-grocery" placeholder="Full name" required autoComplete="name"
                      style={{ paddingLeft: "2.8rem", width: "100%" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Shop Name</label>
                  <div className="input-icon-wrap">
                    <span className="icon">🏪</span>
                    <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                      className="input-grocery" placeholder="Shop name" required
                      style={{ paddingLeft: "2.8rem", width: "100%" }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Email Address</label>
                <div className="input-icon-wrap">
                  <span className="icon">📧</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-grocery" placeholder="your@email.com" required autoComplete="email"
                    style={{ paddingLeft: "2.8rem", width: "100%" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Create Password</label>
                <div className="input-icon-wrap" style={{ position: "relative" }}>
                  <span className="icon">🔒</span>
                  <input type={showPwd ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} className="input-grocery"
                    placeholder="Min. 6 characters" required minLength={6} autoComplete="new-password"
                    style={{ paddingLeft: "2.8rem", paddingRight: "3rem", width: "100%" }} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", fontSize: 15, opacity: 0.5, padding: 0 }}>
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 4,
                          background: i <= strength ? STRENGTH_COLOR[strength] : "#E5E7EB",
                          transition: "background 0.2s" }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: STRENGTH_COLOR[strength], margin: 0, fontWeight: 600 }}>
                      {STRENGTH_LABEL[strength]} password
                    </p>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-grocery-primary"
                style={{ width: "100%", padding: "14px", fontSize: 15, marginTop: 4, borderRadius: 14 }}>
                {loading
                  ? <span style={{ width: 20, height: 20, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  : "Send Verification Code →"}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <p style={{ color: "#9CA3AF", fontSize: 13 }}>
                Already have an account?{" "}
                <Link to="/login" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>Sign In →</Link>
              </p>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── STEP 2: OTP Verification ───────────────────────────────────── */
  return (
    <div className="auth-page">
      <BrandPanel />
      <div className="auth-form-panel animate-auth-in" style={{ flex: 1 }}>
        <div style={{ maxWidth: 440, width: "100%", margin: "0 auto" }}>

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
          </div>

          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step >= s ? "#059669" : "#E5E7EB",
                  color: step >= s ? "#fff" : "#9CA3AF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 12, transition: "all 0.3s",
                }}>{step > s ? "✓" : s}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: step >= s ? "#059669" : "#9CA3AF" }}>
                  {s === 1 ? "Your Details" : "Verify Email"}
                </span>
                {s < 2 && <div style={{ width: 28, height: 2, background: "#E5E7EB", borderRadius: 2 }} />}
              </div>
            ))}
          </div>

          {/* Email icon */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 22,
              background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)",
              border: "2px solid #BBF7D0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 16px",
              boxShadow: "0 4px 20px rgba(16,185,129,0.20)",
            }}>📩</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#064E3B", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
              Check your email
            </h2>
            <p style={{ color: "#6B7280", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              We sent a 6-digit verification code to<br />
              <strong style={{ color: "#059669" }}>{email}</strong>
            </p>
          </div>

          {error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
              padding: "12px 16px", marginBottom: 20, color: "#DC2626",
              fontSize: 13, fontWeight: 500, display: "flex", gap: 8, alignItems: "center",
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleVerifyOTP} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <p style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 16 }}>
                Enter 6-digit OTP
              </p>
              <OTPInput value={otp} onChange={setOtp} />
            </div>

            <button type="submit" disabled={loading || otp.replace(/\s/g,"").length < 6} className="btn-grocery-primary"
              style={{ width: "100%", padding: "14px", fontSize: 15, borderRadius: 14 }}>
              {loading
                ? <span style={{ width: 20, height: 20, border: "2.5px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                : "✓ Verify & Create Account"}
            </button>
          </form>

          {/* Resend + Back */}
          <div style={{ marginTop: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={handleResend} disabled={resendCD > 0 || loading}
              style={{
                background: "none", border: "none", cursor: resendCD > 0 ? "default" : "pointer",
                color: resendCD > 0 ? "#9CA3AF" : "#059669",
                fontWeight: 700, fontSize: 13, padding: 0,
              }}>
              {resendCD > 0 ? `Resend code in ${resendCD}s` : "🔁 Resend OTP"}
            </button>
            <button onClick={() => { setStep(1); setError(""); setOtp(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 12, padding: 0 }}>
              ← Change email or details
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
