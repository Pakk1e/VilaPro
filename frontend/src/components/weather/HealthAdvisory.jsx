import { getPollutantSeverity } from "../utils/airQualityHelpers";

export default function HealthAdvisory({ aqi, pm2_5, forecastData, standard }) {
    // 1. WHO Comparison (Kept as is - separate from AQI standards)
    const whoLimit = 5;
    const isOverLimit = pm2_5 > whoLimit;
    const whoPercentage = Math.round(((pm2_5 - whoLimit) / whoLimit) * 100);

    // 2. USE THE HELPER: This gets the official status and color for the current AQI
    const aqiSeverity = getPollutantSeverity("AQI", aqi, 100, standard);

    // 3. Derived Logic for Activity Cards
    // Map the severity labels to our activity status
    const getAdvice = () => {
        const label = aqiSeverity.label.toLowerCase();

        if (label.includes("good")) return { status: "Safe", sub: "Optimal", theme: "emerald" };
        if (label.includes("moderate") || label.includes("fair")) return { status: "Moderate", sub: "Fair", theme: "amber" };
        if (label.includes("sensitive")) return { status: "Caution", sub: "Sensitive", theme: "amber" };
        return { status: "Avoid", sub: "High Risk", theme: "rose" }; // Unhealthy, Poor, Hazardous
    };

    const outdoor = getAdvice();

    // Windows: Close them if we reach "Unhealthy for Sensitive Groups" (US) or "Fair/Moderate" (EU)
    const windows = aqiSeverity.color === "#10B981" || (standard !== "secondary" && aqi < 40)
        ? { status: "Open", sub: "Fresh Air", theme: "emerald" }
        : { status: "Closed", sub: "Use Filter", theme: "rose" };

    // Mask: Required once we hit the "Unhealthy" (Red) threshold
    const mask = (aqiSeverity.label.includes("Unhealthy") && !aqiSeverity.label.includes("SG")) || aqiSeverity.label.includes("Poor") || aqiSeverity.label.includes("Hazardous")
        ? { status: "Required", sub: "N95/FFP2", theme: "rose" }
        : { status: "Optional", sub: "Low Risk", theme: "emerald" };

    return (
        <aside className="w-full h-full">
            <div className="h-full bg-[#1E293B]/40 backdrop-blur-md rounded-[3rem] p-8 border border-white/5 shadow-2xl flex flex-col">
                <header className="mb-10">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em]">Critical Insights</h3>
                    <p className="text-white text-3xl font-[1000] tracking-tighter mt-1">Health Advisory</p>
                </header>

                <div className="space-y-10 flex-1 w-full">
                    {/* WHO COMPARISON */}
                    <div className="space-y-3 w-full">
                        <div className="flex justify-between items-end w-full">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">vs WHO Limit (PM2.5)</span>
                            <span className={`${isOverLimit ? 'text-rose-400' : 'text-emerald-400'} font-black text-xs`}>
                                {isOverLimit ? `+${whoPercentage}%` : 'Within Limit'}
                            </span>
                        </div>
                        <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isOverLimit ? 'bg-rose-400' : 'bg-emerald-400'}`}
                                style={{
                                    width: `${Math.min((pm2_5 / 25) * 100, 100)}%`,
                                    boxShadow: isOverLimit ? '0 0 15px rgba(251,113,133,0.5)' : 'none'
                                }}
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-normal">
                            {isOverLimit
                                ? "Concentration is above the WHO annual air quality guideline value."
                                : "Air quality meets the recommended WHO safety standards today."}
                        </p>
                    </div>

                    {/* 6H TREND - Now uses your new helper colors for the bars! */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md w-full overflow-hidden">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest block mb-6">
                            6H Forecast Trend
                        </span>

                        <div className="flex items-end justify-between gap-2 w-full h-24 relative px-2">
                            {(() => {
                                const dataArray = Array.isArray(forecastData) ? forecastData : forecastData?.european_aqi || [];
                                if (dataArray.length > 0) {
                                    return dataArray.slice(0, 6).map((val, i) => {
                                        // Dynamic color based on the helper
                                        const barSeverity = getPollutantSeverity("AQI", val, 100, standard);
                                        const barHeightPercent = Math.min(Math.max((val / 100) * 100, 15), 100);

                                        return (
                                            <div key={i} className="group flex-1 flex flex-col justify-end items-center h-full relative">
                                                <div
                                                    className="w-full rounded-t-lg transition-all duration-700 ease-out"
                                                    style={{ height: `${barHeightPercent}%`, backgroundColor: barSeverity.color }}
                                                />
                                                <span className="text-[9px] font-black text-slate-400 uppercase mt-3">
                                                    {i === 0 ? 'Now' : `+${i}h`}
                                                </span>
                                            </div>
                                        );
                                    });
                                }
                                return [...Array(6)].map((_, i) => <div key={i} className="flex-1 bg-white/10 animate-pulse rounded-t-lg h-4" />);
                            })()}
                        </div>
                    </div>

                    {/* ACTIVITY GRID */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <ActivityCard label="Outdoor" value={outdoor.status} sub={outdoor.sub} theme={outdoor.theme} />
                        <ActivityCard label="Windows" value={windows.status} sub={windows.sub} theme={windows.theme} />
                        <ActivityCard label="Mask" value={mask.status} sub={mask.sub} theme={mask.theme} />
                        <ActivityCard
                            label="Sensitive"
                            value={aqiSeverity.label.includes("Good") ? "Safe" : "At Risk"}
                            sub={aqiSeverity.label.includes("Good") ? "No Risk" : "Stay Alert"}
                            theme={aqiSeverity.label.includes("Good") ? "emerald" : "rose"}
                        />
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-white/5 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                    Ref: CAMS-EU-012 // {new Date().toISOString().split('T')[0]}
                </div>
            </div>
        </aside>
    );
}

// ActivityCard remains the same...

function ActivityCard({ label, value, sub, theme }) {
    const themes = {
        rose: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
        amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    };

    return (
        <div className={`p-4 rounded-2xl border ${themes[theme]} backdrop-blur-sm transition-all hover:scale-105 w-full`}>
            {/* Reduced opacity slightly less (from 60 to 80) */}
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
            <p className="text-white font-black text-base leading-tight">{value}</p>
            <p className="text-[10px] font-bold opacity-70 mt-1">{sub}</p>
        </div>
    );
}