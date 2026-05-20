import { useState, useEffect } from "react";
import axios from "axios";
import AlertBanner from "./AlertBanner.jsx";
import ForecastChart from "./ForecastChart.jsx";

const API = "http://localhost:8000";

function MetricCard({ label, value, unit, color }) {
  return (
    <div className={`glass-panel p-6 animate-fade-in-up border-opacity-10 ${color}`}>
      <p className="text-[10px] uppercase font-black tracking-widest opacity-60 mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black">{value}</span>
        <span className="text-xs font-bold opacity-40">{unit}</span>
      </div>
    </div>
  );
}

export default function ForecastPanel() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/products`).then((r) => {
      setProducts(r.data.products);
      if (r.data.products.length) setSelectedProduct(r.data.products[0]);
    }).catch(() => {});
  }, []);

  const runForecast = async () => {
    if (!selectedProduct || !currentStock) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post(`${API}/predict`, {
        product_name: selectedProduct,
        current_stock: parseInt(currentStock, 10),
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Controls */}
      <div className="glass-panel p-8">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-3">
          <span className="w-2 h-8 bg-[#00FFC6] rounded-full"></span>
          Predictive Configuration
        </h2>
        <div className="flex flex-col lg:flex-row gap-8 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-black uppercase tracking-widest text-[#4A5568] mb-3 px-1">Target Product</label>
            <select 
              value={selectedProduct} 
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="input-grocery w-full bg-[#0B0F14] py-4"
            >
              {products.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-black uppercase tracking-widest text-[#4A5568] mb-3 px-1">Physical Inventory Level</label>
            <input 
              type="number" 
              placeholder="Enter current units..." 
              value={currentStock} 
              onChange={(e) => setCurrentStock(e.target.value)}
              className="input-grocery w-full py-4" 
            />
          </div>
          <button 
            onClick={runForecast} 
            disabled={loading || !selectedProduct || !currentStock}
            className="btn-grocery-primary w-full lg:w-auto px-10 py-4 font-black text-lg"
          >
            {loading ? "Processing..." : "Execute Prediction"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel p-6 border-red-500/50 bg-red-500/5 text-red-400 animate-fade-in-up">
          <p className="flex items-center gap-2 font-bold">
            ⚠️ Computation Error: {error}
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-16 h-16 border-4 border-[rgba(0,255,198,0.1)] border-t-[#00FFC6] rounded-full animate-spin"></div>
          <p className="text-[#8B949E] font-bold animate-pulse">Running GRU Neural Inference...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-10 animate-fade-in-up">
          <AlertBanner alert={result.alert} alertMessage={result.alert_message} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Expected Daily Demand" value={result.avg_demand} unit="units" color="border-cyan-500/20 text-cyan-400" />
            <MetricCard label="Safety Stock Buffer" value={result.safety_stock} unit="units" color="border-purple-500/20 text-purple-400" />
            <MetricCard label="Reorder Threshold" value={result.reorder_point} unit="units" color="border-orange-500/20 text-orange-400" />
            <MetricCard label="Calculated Surplus" value={result.current_stock} unit="units" color={result.alert ? "border-red-500/20 text-red-400" : "border-emerald-500/20 text-emerald-400"} />
          </div>

          <div className="glass-panel p-8">
             <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <span className="w-2 h-8 bg-[#00E0FF] rounded-full"></span>
              Demand Projection (7-Day Horizon)
            </h3>
            <div className="h-[400px]">
              <ForecastChart forecast={result.forecast_7_days} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
