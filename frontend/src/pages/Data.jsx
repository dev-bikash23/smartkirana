import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CATEGORY_ICONS = {
  Dairy: "🥛", Grains: "🌾", Oils: "🫙", Spices: "🌶️", Snacks: "🍪",
  Beverages: "☕", Household: "🧹", Personal: "🧴", Condiments: "🍯",
  Grocery: "🛒", Other: "📦",
};

export default function Data() {
  const [inventory, setInventory] = useState({ products: [], total_items: 0, low_stock_count: 0 });
  const [categories, setCategories] = useState({ top_selling: [], low_selling: [], dead_stock: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, catRes] = await Promise.all([
        axios.get(`${API}/inventory`),
        axios.get(`${API}/inventory/categories`),
      ]);
      setInventory(invRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error("Failed to load DB data:", err);
    } finally {
      setLoading(false);
    }
  };

  const products = inventory.products || [];
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const excessCount = products.filter(p => p.stock > (p.minStock || 5) * 3 && p.stock > 50).length;
  const discountedCount = products.filter(p => (p.discount_pct || 0) > 0).length;

  // Group products by category
  const byCategory = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const categoryList = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  const productColors = [
    "from-[#6366F1] to-[#8B5CF6]", "from-[#EC4899] to-[#F43F5E]",
    "from-[#F59E0B] to-[#EF4444]", "from-[#10B981] to-[#059669]",
    "from-[#3B82F6] to-[#2563EB]", "from-[#8B5CF6] to-[#6366F1]",
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center animate-fade-in-up">
        <div className="w-16 h-16 border-4 border-[rgba(168,85,247,0.2)] border-t-[#A855F7] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#475569] font-semibold">Loading database...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 relative z-10">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-8"
        style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4C1D95 100%)" }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #A855F7, transparent)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6366F1, transparent)", transform: "translate(-20%, 20%)" }} />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-4xl border border-white/20 shadow-xl">🗄️</div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white">Database Overview</h1>
                <span className="px-3 py-1 rounded-full bg-[#A855F7]/30 border border-[#A855F7]/50 text-[#E9D5FF] text-xs font-semibold">✦ Live Data</span>
              </div>
              <p className="text-purple-200/70 text-sm">Real-time view of your SmartKirana inventory database</p>
            </div>
          </div>
          <button onClick={loadData}
            className="px-5 py-3 rounded-xl font-bold text-white text-sm border border-white/20 bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: inventory.total_items, icon: "📦", gradient: "from-[#6366F1] to-[#8B5CF6]", text: "text-[#6366F1]", bg: "bg-[#6366F1]/10", border: "border-[#6366F1]/20" },
          { label: "Inventory Value", value: `₹${totalValue.toFixed(0)}`, icon: "💰", gradient: "from-[#10B981] to-[#059669]", text: "text-[#10B981]", bg: "bg-[#10B981]/10", border: "border-[#10B981]/20" },
          { label: "Low Stock Items", value: inventory.low_stock_count, icon: "⚠️", gradient: "from-[#F59E0B] to-[#EF4444]", text: "text-[#F59E0B]", bg: "bg-[#F59E0B]/10", border: "border-[#F59E0B]/20" },
          { label: "Discounted Items", value: discountedCount, icon: "🏷️", gradient: "from-[#EC4899] to-[#F43F5E]", text: "text-[#EC4899]", bg: "bg-[#EC4899]/10", border: "border-[#EC4899]/20" },
        ].map((stat, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl p-5 border ${stat.border} ${stat.bg} animate-fade-in-up backdrop-blur-sm`}
            style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 bg-gradient-to-br ${stat.gradient}`} style={{ transform: "translate(30%, -30%)" }} />
            <div className="flex justify-between items-start mb-3">
              <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">{stat.label}</p>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-lg shadow-md`}>{stat.icon}</div>
            </div>
            <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Category Breakdown + Stock Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Category Breakdown */}
        <div className="relative overflow-hidden rounded-2xl p-6 border border-[#6366F1]/20"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.06) 100%)" }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-1.5 h-7 rounded-full bg-gradient-to-b from-[#6366F1] to-[#8B5CF6]" />
            <h2 className="text-lg font-bold text-[#1E293B]">Category Breakdown</h2>
            <span className="ml-auto text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 px-3 py-1 rounded-full">
              {categoryList.length} categories
            </span>
          </div>
          {categoryList.length === 0 ? (
            <p className="text-[#94A3B8] text-sm text-center py-8">No products yet. Add from Inventory page.</p>
          ) : (
            <div className="space-y-3">
              {categoryList.map(([cat, count], i) => {
                const pct = Math.round((count / inventory.total_items) * 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
                        <span>{CATEGORY_ICONS[cat] || "📦"}</span>{cat}
                      </span>
                      <span className="text-xs text-[#94A3B8]">{count} items · {pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E8EDFF]">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `hsl(${240 + i * 25}, 70%, 60%)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock Health */}
        <div className="relative overflow-hidden rounded-2xl p-6 border border-[#EC4899]/20"
          style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.05) 0%, rgba(244,63,94,0.05) 100%)" }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-1.5 h-7 rounded-full bg-gradient-to-b from-[#EC4899] to-[#F43F5E]" />
            <h2 className="text-lg font-bold text-[#1E293B]">Stock Health</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: "🚀 Fast Moving (Low Stock)", items: categories.top_selling, color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
              { label: "💀 Dead Stock (Excess)", items: categories.dead_stock, color: "#BE123C", bg: "#FFF1F2", border: "#FECDD3" },
            ].map(({ label, items, color, bg, border }) => (
              <div key={label} className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
                <p className="text-xs font-bold mb-2" style={{ color }}>{label} — {items.length} products</p>
                {items.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] italic">None identified</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {items.slice(0, 5).map(p => (
                      <span key={p.id} className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                        style={{ background: color }}>
                        {p.name.split(" ")[0]} ({p.stock})
                      </span>
                    ))}
                    {items.length > 5 && <span className="text-xs text-[#94A3B8] self-center">+{items.length - 5} more</span>}
                  </div>
                )}
              </div>
            ))}
            <div className="rounded-2xl p-4 bg-purple-50 border border-purple-200">
              <p className="text-xs font-bold text-purple-700 mb-2">🏷️ Active Discounts — {discountedCount} products</p>
              {discountedCount === 0
                ? <p className="text-xs text-[#94A3B8] italic">No discounts applied. Go to Deals → Apply Discounts.</p>
                : <p className="text-xs text-purple-600">{discountedCount} products are currently discounted. Check Deals page.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Active SKU Registry */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-[#F59E0B]/20"
        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.04) 0%, rgba(239,68,68,0.04) 100%)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-7 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#EF4444]" />
            <h2 className="text-lg font-bold text-[#1E293B]">Active SKU Registry</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-xs font-semibold">
            {products.length} SKUs
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-[#94A3B8] text-sm">No products in database yet. Add products from the <strong>Inventory</strong> page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {products.map((product, i) => (
              <div key={product.id}
                className="rounded-2xl p-3 text-center transition-all hover:-translate-y-1 cursor-default bg-white/60 border border-white shadow-sm hover:shadow-md">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${productColors[i % productColors.length]} mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                  {(product.name || "?").substring(0, 2).toUpperCase()}
                </div>
                <p className="text-[11px] font-semibold text-[#475569] truncate">{product.name}</p>
                <p className="text-[10px] text-[#94A3B8]">₹{product.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
