import MetricTile from "./MetricTile";
import { getStatusConfig } from "../utils/weatherMetricsHelper";

export default function WindMetric({ speed, units }) {
    // 🟢 No more manual math! The API now sends 'speed' in the correct unit.
    const displaySpeed = Math.round(speed);
    const unitLabel = units === 'imperial' ? 'mph' : 'km/h';

    // Update thresholds based on units so the "Status" is still accurate
    const maxWind = units === 'imperial' ? 30 : 50;
    const percentage = Math.min((displaySpeed / maxWind) * 100, 100);

    const highThreshold = units === 'imperial' ? 20 : 30;
    const modThreshold = units === 'imperial' ? 10 : 15;

    const status = displaySpeed > highThreshold
        ? "High"
        : displaySpeed > modThreshold
            ? "Moderate"
            : "Steady";

    const { color, bgClass } = getStatusConfig(status);

    return (
        <MetricTile
            label="Wind Speed"
            sub={
                <span className={`${bgClass} px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-500`}>
                    {status}
                </span>
            }
        >
            <div className="flex-1 flex flex-col items-center justify-center mt-2">
                <div className="flex flex-col items-center mb-6 leading-none">
                    <span className="text-5xl font-[1000] text-white tracking-tighter">
                        {displaySpeed}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                        {unitLabel}
                    </span>
                </div>

                <div className="w-32 h-12 bg-white/5 rounded-full overflow-hidden relative flex items-center justify-center">
                    <div className="relative w-28 h-auto flex items-center">
                        <svg viewBox="0 0 80 30" className="w-full h-auto" style={{ opacity: 0.1 }}>
                            <path
                                d="M0 15 Q 10 5, 20 15 T 40 15 T 60 15 T 80 15"
                                fill="none"
                                stroke={color}
                                strokeWidth="6"
                                strokeLinecap="round"
                                className="transition-colors duration-500"
                            />
                        </svg>

                        <div
                            className="absolute inset-0 overflow-hidden transition-all duration-1000 ease-out flex items-center"
                            style={{
                                width: `${percentage}%`,
                                borderRight: `1px solid ${color}66`
                            }}
                        >
                            <svg
                                viewBox="0 0 80 30"
                                className="w-28 h-auto flex-shrink-0"
                                style={{ filter: `drop-shadow(0 0 8px ${color}99)` }}
                            >
                                <path
                                    d="M0 15 Q 10 5, 20 15 T 40 15 T 60 15 T 80 15"
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    className="transition-colors duration-500"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}