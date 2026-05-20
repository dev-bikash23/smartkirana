import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const colorStyles = {
  records: "border-[#00FFC6] text-[#00FFC6]",
  date: "border-[#00E0FF] text-[#00E0FF]",
  products: "border-[#A855F7] text-[#A855F7]",
  units: "border-[#FB923C] text-[#FB923C]"
};

function LoadingCard() {
  return (
    <div className="glass-panel p-6 animate-pulse">
      <div className="h-4 w-24 bg-[rgba(255,255,255,0.05)] rounded mb-4"></div>
      <div className="h-8 w-32 bg-[rgba(255,255,255,0.05)] rounded"></div>
    </div>
  );
}

export default function SummaryCards() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/dataset-summary`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="glass-panel p-6 border-red-500/50 bg-red-500/5 text-red-400">
        <p className="flex items-center gap-2 font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Dataset sync error
        </p>
        <p className="text-xs mt-1 opacity-70">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => <LoadingCard key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      key: "records",
      label: "History Points",
      value: data.total_records.toLocaleString(),
      sub: "Total dataset rows",
      icon: "📊"
    },
    {
      key: "date",
      label: "Time Horizon",
      value: data.date_range.start,
      sub: `to ${data.date_range.end}`,
      icon: "📅"
    },
    {
      key: "products",
      label: "Unique SKU",
      value: data.products.length,
      sub: "Active products",
      icon: "🏷️"
    },
    {
      key: "units",
      label: "Demand Index",
      value: data.avg_units_sold,
      sub: `₹${data.avg_price} avg price`,
      icon: "📦"
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c, i) => (
        <div
          key={c.key}
          className={`glass-panel p-6 animate-fade-in-up hover:border-opacity-100 border-opacity-20 ${colorStyles[c.key]}`}
          style={{ animationDelay: `${i * 0.1}s`, borderWidth: '1px' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest opacity-60">
              {c.label}
            </span>
            <span className="text-2xl filter saturate-[0.8]">{c.icon}</span>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{c.value}</p>
          <p className="text-xs font-medium text-[#8B949E] mt-2">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
