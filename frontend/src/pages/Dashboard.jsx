import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import AlertBanner from "../components/AlertBanner";
import { useAuth } from "../App";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState({ top_selling: [], low_selling: [], dead_stock: [] });
  const [inventory, setInventory] = useState({ total_items: 0, low_stock_count: 0, products: [] });
  const [trending, setTrending]   = useState({ discounted_products: [] });
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("splash_shown"));

  useEffect(() => {
    axios.get(`${API}/inventory/categories`).then(r => setCategories(r.data)).catch(() => {});
    axios.get(`${API}/inventory`).then(r => setInventory(r.data)).catch(() => {});
    axios.get(`${API}/trending`).then(r => setTrending(r.data)).catch(() => {});
    if (showSplash) {
      sessionStorage.setItem("splash_shown", "1");
      setTimeout(() => setShowSplash(false), 2500);
    }
  }, []);

  const quickActions = [
    { href: "/inventory", icon: "📦", title: "Inventory",   desc: "Manage your products",   color: "from-[#4F7CFF] to-[#6B8FFF]" },
    { href: "/deals",     icon: "🛍️", title: "Deals",       desc: "AI-powered discounts",    color: "from-[#F43F5E] to-[#E11D48]" },
    { href: "/trending",  icon: "✨", title: "AI Analyst",  desc: "Trends & AI insights",    color: "from-[#FF9500] to-[#E68900]" },
    { href: "/orders",    icon: "🧾", title: "Orders",      desc: "View order history",      color: "from-[#22C55E] to-[#16A34A]" },
    { href: "/test",      icon: "🧠", title: "AI Stock",    desc: "AI stock analysis",       color: "from-[#A855F7] to-[#7C3AED]" },
  ];

  const totalValue = inventory.products.reduce((s, p) => s + p.stock * p.price, 0);

  const renderProductList = (title, items, badgeClass) => (
    <div className="glass-panel p-5 flex-1">
      <h3 className="text-base font-bold text-[#1E293B] mb-4 flex justify-between items-center">
        <span>{title}</span>
        <span className={`badge ${badgeClass}`}>{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-[#94A3B8] text-sm py-4 text-center italic">No products found.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl bg-[rgba(79,124,255,0.04)] border border-[rgba(79,124,255,0.08)] hover:border-[rgba(79,124,255,0.2)] transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.image}</span>
                <div>
                  <p className="font-semibold text-sm text-[#1E293B]">{item.name}</p>
                  <p className="text-xs text-[#94A3B8]">Stock: {item.stock}</p>
                </div>
              </div>
              <span className="badge badge-blue text-xs">{item.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">

      {/* Splash Screen */}
      {showSplash && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #4F7CFF 0%, #6B8FFF 60%, #C4D8FF 100%)" }}
          onClick={() => setShowSplash(false)}
        >
          <div className="text-center animate-fade-in-up px-8">
            <div className="w-28 h-28 mx-auto rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl mb-6 animate-float overflow-hidden">
              <img src="/logo.png" alt="SmartKirana" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Welcome to SmartKirana</h1>
            <p className="text-white/80 text-lg">AI That Keeps Your Shelves Full</p>
            <div className="mt-8 flex justify-center gap-2">
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]"/>
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]"/>
              <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce"/>
            </div>
          </div>
        </div>
      )}

      {/* Alert Banner – only Dashboard & Inventory */}
      <AlertBanner />

      {/* Header */}
      <div className="glass-panel-strong p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4F7CFF] to-[#6B8FFF] flex items-center justify-center shadow-lg ring-4 ring-[rgba(79,124,255,0.2)] overflow-hidden">
            <img src="/logo.png" alt="SmartKirana" className="w-11 h-11 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#1E293B]">{user?.shopName || "SmartKirana"}</h1>
              <span className="badge badge-ai text-[10px]">🤖 AI-Powered</span>
            </div>
            <p className="text-[#475569] text-sm">Welcome back, <strong>{user?.name}</strong> — your AI is ready.</p>
          </div>
        </div>
        <button
          id="qr-scan-btn"
          onClick={() => setShowScanner(true)}
          className="btn-grocery-primary px-6 py-3 text-base"
        >
          📷 Scan & Sell
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: inventory.total_items, icon: "📦", color: "text-[#4F7CFF]" },
          { label: "Low Stock Items", value: inventory.low_stock_count, icon: "⚠️", color: "text-[#FF9500]" },
          { label: "Inventory Value", value: `₹${totalValue.toFixed(0)}`, icon: "💰", color: "text-[#22C55E]" },
          { label: "Alert Status", value: inventory.low_stock_count > 0 ? "Action Needed" : "All Good", icon: "🔔", color: inventory.low_stock_count > 0 ? "text-red-500" : "text-[#22C55E]" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-5 animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{s.label}</p>
              <span className="text-2xl">{s.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4 px-1">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((a, i) => (
            <Link
              key={a.href}
              to={a.href}
              className="glass-panel p-5 group hover:border-[rgba(79,124,255,0.3)] animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                {a.icon}
              </div>
              <p className="font-bold text-[#1E293B] text-sm">{a.title}</p>
              <p className="text-xs text-[#94A3B8] mt-1">{a.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Active Deals Preview ── */}
      {trending.discounted_products?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest">🛍️ Active Deals</h2>
            <Link to="/deals" className="text-xs font-semibold text-[#4F7CFF] hover:underline">View All →</Link>
          </div>
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold text-[#1E293B] mb-3 flex items-center gap-2">
              <span className="w-2 h-5 bg-orange-400 rounded-full"/>
              🏷️ Discounted Products
              <span className="ml-auto badge badge-orange">{trending.discounted_products?.length}</span>
            </h3>
            <div className="space-y-2">
              {trending.discounted_products.slice(0, 5).map((p, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-[rgba(79,124,255,0.06)] last:border-0">
                  <span className="text-sm font-medium text-[#1E293B] truncate flex-1">{p.name}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-lg bg-orange-100 text-orange-600 text-xs font-black">{p.discount_pct}% OFF</span>
                </div>
              ))}
              {trending.discounted_products.length > 5 && (
                <Link to="/deals" className="text-xs text-[#4F7CFF] font-semibold hover:underline block text-center pt-1">
                  +{trending.discounted_products.length - 5} more →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Analytics */}
      <div>
        <h2 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4 px-1">Stock Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {renderProductList("🚀 Fast Moving", categories.top_selling, "badge-teal")}
          {renderProductList("🐢 Slow Moving", categories.low_selling, "badge-orange")}
          {renderProductList("💀 Dead Stock",  categories.dead_stock,  "badge-red")}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <QRScannerModal onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}

/* ── Inline multi-scan modal ─────────────────────────────────────────── */
import { useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

function QRScannerModal({ onClose }) {
  const html5QrRef = useRef(null);
  const [scanStatus, setScanStatus] = useState("idle");
  const [cart, setCart] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [billSaved, setBillSaved] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devs => {
        if (devs && devs.length > 0) { setCameras(devs); setCameraId(devs[0].id); }
        else { setErrorMsg("No camera detected."); setScanStatus("error"); }
      })
      .catch(() => { setErrorMsg("Camera access denied."); setScanStatus("error"); });
    return () => stopScanner();
  }, []);

  const startScanner = () => {
    if (!cameraId) return;
    setScanStatus("scanning"); setErrorMsg("");
    const qr = new Html5Qrcode("qr-modal-region");
    html5QrRef.current = qr;
    qr.start(cameraId, { fps: 10, qrbox: { width: 220, height: 220 } },
      (text) => { stopScanner(); handleScan(text); },
      () => {}
    ).catch(e => { setScanStatus("error"); setErrorMsg("Camera error: " + e); });
  };

  const stopScanner = () => {
    if (html5QrRef.current) { html5QrRef.current.stop().catch(() => {}); html5QrRef.current = null; }
  };

  const handleScan = async (text) => {
    try {
      const payload = JSON.parse(text);
      if (!payload.product_id) throw new Error("Invalid QR");
      const res = await axios.post(`${API}/inventory/scan`, payload);
      // mrp = original price (GST-inclusive), price = selling price after discount
      const { product_name, mrp, price, discount_pct, profit_rate } = res.data;
      const effectiveMrp = mrp ?? price; // fallback if backend older
      setCart(prev => {
        const idx = prev.findIndex(c => c.product_id === payload.product_id);
        if (idx >= 0) {
          const updated = [...prev];
          const q = updated[idx].quantity + 1;
          updated[idx] = { ...updated[idx], quantity: q, subtotal: q * price };
          return updated;
        }
        return [...prev, {
          product_id: payload.product_id,
          product_name,
          mrp: effectiveMrp,          // original MRP (shown on bill, GST-inclusive)
          price,                       // selling price (after discount)
          discount_pct: discount_pct || 0,
          profit_rate: profit_rate || 10,
          quantity: 1,
          subtotal: price
        }];
      });
      setScanStatus("scanned");
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err.message);
      setScanStatus("scan_error");
    }
  };

  // GST is INCLUDED in the price (not added on top).
  // Extract GST component: if rate=18%, gst = price - price/1.18
  const GST_RATE = 0.18;
  const extractGST  = (amount) => amount - amount / (1 + GST_RATE);
  const extractBase = (amount) => amount / (1 + GST_RATE);

  const totalSellingAmt = cart.reduce((s, c) => s + c.subtotal, 0);
  const totalMRP        = cart.reduce((s, c) => s + c.mrp * c.quantity, 0);
  const totalDiscount   = totalMRP - totalSellingAmt;
  const totalGST        = extractGST(totalSellingAmt);    // GST within selling price
  const totalBaseAmt    = extractBase(totalSellingAmt);   // pre-GST base amount
  const totalBillAmt    = totalSellingAmt;                // customer pays exactly this (GST already inside)

  const finishOrder = async () => {
    if (cart.length === 0) return;
    setSavingOrder(true);
    try {
      await axios.post(`${API}/orders`, {
        items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity }))
      });
      setBillSaved(true); setShowBill(true);
    } catch (err) {
      setShowBill(true); // Show bill anyway even if save fails
    } finally { setSavingOrder(false); }
  };

  if (showBill) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="glass-panel-strong w-full max-w-md p-6 animate-fade-in-up">

        {/* Bill Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-1">🧾</div>
          <h2 className="text-xl font-bold text-[#1E293B]">Tax Invoice</h2>
          <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">All prices are MRP (GST inclusive)</p>
          {billSaved && <p className="text-xs text-[#22C55E] mt-1">✓ Order saved successfully</p>}
        </div>

        {/* Line items */}
        <div className="space-y-0 mb-4 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
          {cart.map((c, i) => {
            const hasDiscount = c.discount_pct > 0;
            const itemGST     = extractGST(c.subtotal);
            const itemBase    = extractBase(c.subtotal);
            return (
              <div key={i} className="py-2.5 border-b border-[#E8EDFF] last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-3">
                    <p className="font-semibold text-sm text-[#1E293B]">{c.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* MRP — always shown */}
                      <span className="text-xs text-[#94A3B8]">MRP ₹{c.mrp.toFixed(2)}</span>
                      {hasDiscount && (
                        <>
                          <span className="text-[10px] text-white bg-red-500 rounded px-1.5 py-0.5 font-bold">
                            -{c.discount_pct}%
                          </span>
                          <span className="text-xs text-[#22C55E] font-semibold">₹{c.price.toFixed(2)}</span>
                        </>
                      )}
                      <span className="text-[10px] text-[#94A3B8]">× {c.quantity}</span>
                    </div>
                    <p className="text-[10px] text-[#B0BEC5] mt-0.5">
                      Base ₹{itemBase.toFixed(2)} + GST@18% ₹{itemGST.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold text-[#4F7CFF] text-sm whitespace-nowrap">₹{c.subtotal.toFixed(2)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary box */}
        <div className="bg-[rgba(79,124,255,0.06)] rounded-2xl p-4 space-y-2 mb-5">
          <div className="flex justify-between text-sm text-[#475569]">
            <span>Total Items</span>
            <span className="font-semibold">{cart.reduce((s,c)=>s+c.quantity,0)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#475569]">
            <span>MRP Total</span>
            <span className="font-semibold">₹{totalMRP.toFixed(2)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-red-500 font-semibold">
              <span>🏷️ Discount Savings</span>
              <span>- ₹{totalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-[#475569] border-t border-[rgba(79,124,255,0.12)] pt-2">
            <span>Taxable Amount (excl. GST)</span>
            <span className="font-semibold">₹{totalBaseAmt.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#FF9500] font-semibold">
            <span>GST @18% (included in price)</span>
            <span>₹{totalGST.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base text-[#22C55E] pt-2 border-t border-[rgba(79,124,255,0.2)]">
            <span>Total Payable</span>
            <span>₹{totalBillAmt.toFixed(2)}</span>
          </div>
        </div>

        <button onClick={onClose} className="btn-grocery-primary w-full py-3">✓ Done</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="glass-panel-strong w-full max-w-lg animate-fade-in-up overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8EDFF] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-[#1E293B] text-lg">📷 Scan Products</h2>
            <p className="text-xs text-[#94A3B8]">Scan QR codes to add items to order</p>
          </div>
          <button onClick={() => { stopScanner(); onClose(); }} className="text-2xl text-[#94A3B8] hover:text-[#1E293B]">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Camera selector */}
          {cameras.length > 1 && scanStatus === "idle" && (
            <select className="input-grocery w-full" value={cameraId} onChange={e => setCameraId(e.target.value)}>
              {cameras.map(c => <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0,6)}`}</option>)}
            </select>
          )}

          {/* Viewfinder */}
          <div id="qr-modal-region" className="rounded-2xl overflow-hidden bg-black"
            style={{ minHeight: scanStatus === "scanning" ? "280px" : "0", display: scanStatus === "scanning" ? "block" : "none" }} />

          {/* States */}
          {(scanStatus === "idle" || scanStatus === "scanned" || scanStatus === "scan_error") && (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#4F7CFF] to-[#6B8FFF] flex items-center justify-center text-4xl shadow-lg animate-float">
                📷
              </div>
              {scanStatus === "scanned" && (
                <p className="text-[#22C55E] font-semibold text-sm mb-3">✓ Product added! Scan next or finish.</p>
              )}
              {scanStatus === "scan_error" && (
                <p className="text-red-500 text-sm mb-3">⚠️ {errorMsg}</p>
              )}
              <button onClick={startScanner} className="btn-grocery-primary w-full py-3">
                {scanStatus === "scanned" ? "📷 Scan Next Product" : "📷 Start Scanner"}
              </button>
            </div>
          )}

          {scanStatus === "error" && (
            <div className="text-center py-4">
              <p className="text-red-500 text-sm">{errorMsg}</p>
            </div>
          )}

          {scanStatus === "scanning" && (
            <div className="flex justify-center">
              <button onClick={() => { stopScanner(); setScanStatus("idle"); }} className="btn-grocery-secondary w-full py-3">
                ⬅ Cancel Scan
              </button>
            </div>
          )}

          {/* Cart */}
          {cart.length > 0 && (
            <div className="bg-[rgba(79,124,255,0.05)] rounded-2xl p-4 border border-[rgba(79,124,255,0.12)]">
              <h3 className="font-bold text-[#1E293B] text-sm mb-3 flex items-center gap-2">
                🛒 Cart ({cart.reduce((s,c)=>s+c.quantity,0)} items)
              </h3>
              <div className="space-y-2 mb-4">
                {cart.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-[#475569]">{c.product_name} × {c.quantity}</span>
                    <span className="font-semibold text-[#4F7CFF]">₹{c.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[rgba(79,124,255,0.15)] pt-3 flex justify-between font-bold text-[#1E293B]">
                <span>Total</span>
                <span className="text-[#4F7CFF]">₹{totalSellingAmt.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E8EDFF] shrink-0">
            <button
              onClick={finishOrder}
              disabled={savingOrder}
              className="btn-grocery-primary w-full py-3 text-base"
            >
              {savingOrder ? "Saving..." : "✅ Finish & Generate Bill"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
