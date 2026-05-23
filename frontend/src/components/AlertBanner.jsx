import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config.js";

export default function AlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    axios.get(`${API}/inventory`)
      .then(res => {
        const { products } = res.data;
        const newAlerts = [];
        const stockouts   = products.filter(p => p.stock === 0);
        const lowStock    = products.filter(p => p.stock > 0 && p.stock < p.minStock);
        const deadStock   = products.filter(p => p.stock >= p.minStock * 3 && p.stock > 50);

        if (stockouts.length > 0)
          newAlerts.push({ id: "stockout", type: "critical", icon: "🚨", title: "Stockout Alert",
            message: `${stockouts.length} product(s) are completely out of stock!` });
        if (lowStock.length > 0)
          newAlerts.push({ id: "lowstock", type: "warning", icon: "⚠️", title: "Low Stock Warning",
            message: `${lowStock.length} product(s) are running low. Reorder recommended.` });
        if (deadStock.length > 0)
          newAlerts.push({ id: "deadstock", type: "info", icon: "📦", title: "Excess Stock Notice",
            message: `${deadStock.length} product(s) have excess inventory. Consider promotions.` });

        setAlerts(newAlerts);
      })
      .catch(() => {});
  }, []);

  const visible = alerts.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const colors = {
    critical: { bg: "bg-red-50 border-red-200", text: "text-red-700", btn: "bg-red-500 text-white" },
    warning:  { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", btn: "bg-orange-500 text-white" },
    info:     { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", btn: "bg-blue-500 text-white" },
  };

  return (
    <div className="flex flex-col gap-3">
      {visible.map(alert => {
        const c = colors[alert.type];
        return (
          <div key={alert.id} className={`animate-fade-in-up rounded-2xl px-5 py-4 flex items-center justify-between gap-4 border ${c.bg}`}>
            <div className="flex items-center gap-4">
              <span className="text-3xl">{alert.icon}</span>
              <div>
                <h4 className={`font-bold text-sm ${c.text}`}>{alert.title}</h4>
                <p className="text-[#475569] text-xs mt-0.5">{alert.message}</p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(d => [...d, alert.id])}
              className="text-[#94A3B8] hover:text-[#475569] text-lg shrink-0"
            >✕</button>
          </div>
        );
      })}
    </div>
  );
}
