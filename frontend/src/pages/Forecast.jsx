import ForecastPanel from "../components/ForecastPanel";

export default function Forecast() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      <div className="animate-fade-in-up flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(0,255,198,0.05)] border border-[rgba(0,255,198,0.1)] flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(0,255,198,0.1)]">
          🤖
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Demand Intelligence</h1>
          <p className="text-[#8B949E] mt-1">7-day predictive analysis powered by GRU Neural Networks</p>
        </div>
      </div>
      <ForecastPanel />
    </div>
  );
}
