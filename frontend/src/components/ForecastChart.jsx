import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel-strong px-5 py-3 text-sm border-[rgba(0,224,255,0.2)]">
      <p className="text-[#8B949E] text-[10px] uppercase font-black tracking-widest mb-1">{label}</p>
      <p className="text-[#00E0FF] font-black text-2xl">{payload[0].value} <span className="text-xs opacity-50 font-medium">units</span></p>
    </div>
  );
};

export default function ForecastChart({ forecast }) {
  if (!forecast || forecast.length === 0) return null;

  const data = forecast.map((val, i) => ({
    name: `D+${i + 1}`,
    units: val,
  }));

  const maxVal = Math.max(...forecast);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#4A5568", fontSize: 11, fontWeight: 700 }}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#4A5568", fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
          <Bar dataKey="units" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.units === maxVal ? "#00E0FF" : "#00FFC6"}
                fillOpacity={entry.units === maxVal ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
