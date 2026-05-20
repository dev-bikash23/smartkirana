import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label, color }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.95)",
      border: `1px solid ${color}40`,
      borderRadius: 14,
      padding: "10px 16px",
      boxShadow: `0 8px 24px ${color}20`,
    }}>
      <p style={{ color: "#94A3B8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</p>
      <p style={{ color, fontWeight: 800, fontSize: 22 }}>
        {payload[0].value} <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 500 }}>units</span>
      </p>
    </div>
  );
};

export default function HistoryChart({ dates, unitsSold, product, chartColor = "#4F7CFF" }) {
  if (!dates || dates.length === 0) return null;
  const data = dates.map((d, i) => ({ date: d, units: unitsSold[i] }));
  const avg  = Math.round(unitsSold.reduce((a, b) => a + b, 0) / unitsSold.length);
  const gradId = `grad-${chartColor.replace("#", "")}`;

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 24 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={chartColor} stopOpacity={0.22} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />

          <ReferenceLine
            y={avg}
            stroke={chartColor}
            strokeDasharray="5 4"
            strokeOpacity={0.4}
            label={{ value: `Avg ${avg}`, position: "right", fill: chartColor, fontSize: 10, fontWeight: 700 }}
          />

          <XAxis
            dataKey="date"
            tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }}
            axisLine={{ stroke: "#E8EDFF" }}
            tickLine={false}
            interval="preserveStartEnd"
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip color={chartColor} />}
            cursor={{ stroke: `${chartColor}40`, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="units"
            stroke={chartColor}
            strokeWidth={3}
            fill={`url(#${gradId})`}
            dot={{ r: 3, fill: "#fff", stroke: chartColor, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: chartColor, stroke: "#fff", strokeWidth: 2 }}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
