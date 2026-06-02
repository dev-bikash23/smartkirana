import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, useRef, createContext, useContext } from "react";
import axios from "axios";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import History from "./pages/History";
import Inventory from "./pages/Inventory";
import Data from "./pages/Data";
import Test from "./pages/Test";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Trending from "./pages/Trending";
import Deals from "./pages/Deals";
import Register from "./pages/Register";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ── Auth Context ────────────────────────────────────────────────────── */
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/* ── Theme Context ───────────────────────────────────────────────────── */
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

/* ── Server Status Context ───────────────────────────────────────────── */
const ServerContext = createContext(null);
export const useServer = () => useContext(ServerContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("sk_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sk_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ── Server Wakeup Banner ────────────────────────────────────────────── */
function ServerWakeupBanner({ onRetrySuccess }) {
  const [dots, setDots]     = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const dotInterval = setInterval(() => setDots(d => (d + 1) % 4), 600);
    const secInterval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { clearInterval(dotInterval); clearInterval(secInterval); };
  }, []);

  // Auto-retry every 5 seconds
  useEffect(() => {
    const retry = async () => {
      try {
        setRetrying(true);
        await axios.get("/ping", { timeout: 8000 });
        onRetrySuccess();
      } catch {
        setRetrying(false);
      }
    };
    retry(); // immediate first try
    const interval = setInterval(retry, 5000);
    return () => clearInterval(interval);
  }, [onRetrySuccess]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg, #0D0B1F 0%, #12103A 55%, #0D0B1F 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Poppins', sans-serif",
    }}>
      {/* Glowing logo */}
      <div style={{
        width: 88, height: 88, borderRadius: 28,
        background: "linear-gradient(135deg, #6C63FF, #9D97FF)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 60px rgba(108,99,255,0.55)",
        marginBottom: 28, overflow: "hidden",
        animation: "pulse 2s ease-in-out infinite",
      }}>
        <img src="/logo.png" alt="SmartKirana" style={{ width: 60, height: 60, objectFit: "contain" }} />
      </div>

      <h2 style={{ color: "#F0EEFF", fontWeight: 800, fontSize: 22, margin: "0 0 8px" }}>
        SmartKirana
      </h2>
      <p style={{ color: "#9D97FF", fontSize: 14, fontWeight: 500, margin: "0 0 28px" }}>
        Server is waking up{".".repeat(dots + 1)}
      </p>

      {/* Animated progress bar */}
      <div style={{
        width: 240, height: 4, background: "rgba(255,255,255,0.08)",
        borderRadius: 4, overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{
          height: "100%",
          background: "linear-gradient(90deg, #6C63FF, #1BCDFE)",
          borderRadius: 4,
          animation: "wakeupSlide 5s linear infinite",
        }} />
      </div>

      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>
        {retrying ? "⚡ Retrying…" : `Elapsed: ${seconds}s — Auto-retrying every 5s`}
      </p>
      <p style={{ color: "rgba(255,255,255,0.20)", fontSize: 11, margin: "8px 0 0" }}>
        Free-tier server starts in ~30 seconds
      </p>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 40px rgba(108,99,255,0.45); }
          50%      { box-shadow: 0 0 80px rgba(108,99,255,0.75); }
        }
        @keyframes wakeupSlide {
          0%   { width: 0%; margin-left: 0; }
          50%  { width: 70%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

/* ── Auth Provider ───────────────────────────────────────────────────── */
function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);
  const keepAliveRef = useRef(null);

  /* ── Keep-alive ping every 12 minutes ───────────────────────────── */
  useEffect(() => {
    const ping = async () => {
      try {
        await axios.get("/ping", { timeout: 6000 });
        setServerDown(false);
      } catch (err) {
        if (!err.response) setServerDown(true); // network error = server sleeping
      }
    };

    // Ping immediately on mount
    ping();
    keepAliveRef.current = setInterval(ping, 12 * 60 * 1000); // every 12 min
    return () => clearInterval(keepAliveRef.current);
  }, []);

  /* ── Axios response interceptor — detect server sleeping ─────────── */
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => { setServerDown(false); return res; },
      (err) => {
        // Network error with no response = server is down/sleeping
        if (!err.response && (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED" || err.message === "Network Error")) {
          setServerDown(true);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, []);

  /* ── Restore session from stored token ──────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem("supply_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get("/auth/me")
        .then(res => {
          const u = res.data;
          setUser({ id: u.id, name: u.name, shopName: u.shopName, email: u.email });
        })
        .catch(() => {
          localStorage.removeItem("supply_token");
          delete axios.defaults.headers.common["Authorization"];
        })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const formData = new URLSearchParams();
    formData.append("username", normalizedEmail);
    formData.append("password", password);
    const res = await axios.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const token = res.data.access_token;
    localStorage.setItem("supply_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const u = res.data.user;
    setUser({ id: u.id, name: u.name, shopName: u.shopName, email: u.email });
    setServerDown(false);
  };

  /* loginWithToken is called after OTP verification — token already obtained */
  const loginWithToken = (token, userData) => {
    localStorage.setItem("supply_token", token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser({ id: userData.id, name: userData.name, shopName: userData.shopName, email: userData.email });
    setServerDown(false);
  };

  const register = async (userData) => {
    const normalizedData = { ...userData, email: userData.email.trim().toLowerCase() };
    await axios.post("/auth/register", normalizedData);
    await login(normalizedData.email, normalizedData.password);
  };

  const logout = () => {
    axios.post("/auth/logout").catch(() => {});
    setUser(null);
    localStorage.removeItem("supply_token");
    delete axios.defaults.headers.common["Authorization"];
  };

  /* Server wakeup full-screen banner */
  if (serverDown) {
    return <ServerWakeupBanner onRetrySuccess={() => {
      setServerDown(false);
      // Re-check auth after server wakes up
      const token = localStorage.getItem("supply_token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        axios.get("/auth/me").then(res => {
          const u = res.data;
          setUser({ id: u.id, name: u.name, shopName: u.shopName, email: u.email });
        }).catch(() => {});
      }
    }} />;
  }

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0D0B1F 0%, #12103A 55%, #0D0B1F 100%)",
    }}>
      <div style={{ textAlign: "center" }} className="animate-fade-in-up">
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: "0 auto 20px",
          background: "linear-gradient(135deg, #6C63FF, #9D97FF)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 40px rgba(108,99,255,0.45)", overflow: "hidden",
        }} className="animate-float">
          <img src="/logo.png" alt="SmartKirana" style={{ width: 56, height: 56, objectFit: "contain" }} />
        </div>
        <h2 style={{ color: "#F0EEFF", fontWeight: 800, fontSize: 20, margin: "0 0 16px" }}>SmartKirana</h2>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {["-0.3s", "-0.15s", "0s"].map((d, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "linear-gradient(135deg, #6C63FF, #1BCDFE)",
              animation: `bounce 1s ${d} infinite`,
            }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ── Protected Route ─────────────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* ── App Routes ──────────────────────────────────────────────────────── */
function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ color: "var(--text-heading)" }}>
        {user && <Navbar />}
        <main className="flex-1">
          <Routes>
            <Route path="/login"     element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register"  element={user ? <Navigate to="/" replace /> : <Register />} />
            <Route path="/"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/forecast"  element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
            <Route path="/history"   element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/data"      element={<ProtectedRoute><Data /></ProtectedRoute>} />
            <Route path="/test"      element={<ProtectedRoute><Test /></ProtectedRoute>} />
            <Route path="/orders"    element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/trending"  element={<ProtectedRoute><Trending /></ProtectedRoute>} />
            <Route path="/deals"     element={<ProtectedRoute><Deals /></ProtectedRoute>} />
          </Routes>
        </main>
        {user && (
          <footer className="footer-grocery">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-2 opacity-70">
              <p>© 2026 <span style={{ color: "var(--primary)", fontWeight: 700 }}>SmartKirana</span> — {user.shopName}</p>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, background: "#10B981", borderRadius: "50%", display: "inline-block" }}/>
                  AI Engine Active
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 8, height: 8, background: "var(--primary)", borderRadius: "50%", display: "inline-block" }}/>
                  Secure Node
                </span>
              </div>
            </div>
          </footer>
        )}
      </div>
    </BrowserRouter>
  );
}

/* ── Root ────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
