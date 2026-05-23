import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
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

/* ── Auth Provider ───────────────────────────────────────────────────── */
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <AuthContext.Provider value={{ user, login, register, logout }}>
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
