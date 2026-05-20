import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    axios.get(`${API}/orders`)
      .then(r => setOrders(r.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalProfit  = orders.reduce((s, o) => s + o.total_profit, 0);

  const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 relative z-10">

      {/* Header */}
      <div className="glass-panel-strong p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-3xl shadow-lg">🧾</div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Order History</h1>
            <p className="text-[#475569] text-sm mt-1">All orders with revenue & profit breakdown</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Orders",   value: orders.length,             color: "text-[#4F7CFF]" },
          { label: "Total Revenue",  value: `₹${totalRevenue.toFixed(2)}`, color: "text-[#1E293B]" },
          { label: "Total Profit",   value: `₹${totalProfit.toFixed(2)}`,  color: "text-[#22C55E]" },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 text-center">
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-[rgba(79,124,255,0.2)] border-t-[#4F7CFF] rounded-full animate-spin"/>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <div className="text-6xl mb-4">🧾</div>
          <h3 className="text-xl font-bold text-[#1E293B] mb-2">No Orders Yet</h3>
          <p className="text-[#475569] text-sm">Scan products from the Dashboard to create orders.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="glass-panel overflow-hidden animate-fade-in-up">
              <button
                className="w-full p-5 flex items-center justify-between hover:bg-[rgba(79,124,255,0.03)] transition-all"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F7CFF] to-[#6B8FFF] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    #{order.id}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[#1E293B] text-sm">{fmt(order.created_at)}</p>
                    <p className="text-xs text-[#94A3B8]">{order.item_count} product(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-[#1E293B]">₹{order.total_amount?.toFixed(2)}</p>
                    <p className="text-xs text-[#22C55E]">Profit: ₹{order.total_profit?.toFixed(2)}</p>
                  </div>
                  <span className={`text-[#94A3B8] transition-transform duration-200 ${expanded === order.id ? "rotate-180" : ""}`}>▼</span>
                </div>
              </button>

              {/* Order Details */}
              {expanded === order.id && (
                <div className="px-5 pb-5 border-t border-[#E8EDFF]">
                  <div className="mt-4 space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[rgba(79,124,255,0.04)] border border-[rgba(79,124,255,0.08)]">
                        <div>
                          <p className="font-semibold text-sm text-[#1E293B]">{item.product_name}</p>
                          <p className="text-xs text-[#94A3B8]">₹{item.unit_price?.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-[#4F7CFF]">₹{item.subtotal?.toFixed(2)}</p>
                          <p className="text-xs text-[#22C55E]">+₹{item.profit?.toFixed(2)} profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#E8EDFF] flex justify-between items-center">
                    <div>
                      <p className="text-sm text-[#475569]">Order Total</p>
                      <p className="text-xs text-[#22C55E]">Profit margin</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#4F7CFF]">₹{order.total_amount?.toFixed(2)}</p>
                      <p className="text-sm font-semibold text-[#22C55E]">₹{order.total_profit?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
