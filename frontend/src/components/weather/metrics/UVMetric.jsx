// UVMetric.jsx
import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";
import { getStatusConfig } from "../utils/weatherMetricsHelper";

export default function UVMetric({ uv }) {
    // Mapping UV 0-11 to 0-100%
    const percent = Math.min((uv / 11) * 100, 100);
    const status = uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : "High";
    const { color, bgClass } = getStatusConfig(status);

    return (
        <MetricTile
            label="UV Index"
            sub={
                <span className={`${bgClass} px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors duration-500`}>
                    {status}
                </span>
            }
        >
            {/* Centered Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative mt-2">

                {/* Ring Container */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <MetricRing
                        value={percent}
                        color={color}
                        size={120} // Fixed
                        stroke={10} // Fixed
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="text-3xl font-[1000] text-white tracking-tighter">
                            {uv.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                            Index
                        </span>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}