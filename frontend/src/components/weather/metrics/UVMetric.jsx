// UVMetric.jsx
import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";

export default function UVMetric({ uv }) {
    // Mapping UV 0-11 to 0-100%
    const percent = Math.min((uv / 11) * 100, 100);
    const status = uv <= 2 ? "Low" : uv <= 5 ? "Moderate" : "High";

    return (
        <MetricTile label="UV Index" sub={status}>
            {/* Centered Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative mt-2">

                {/* Ring Container */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <MetricRing
                        value={percent}
                        color="#FACC15"
                        size={160} // Increased size for better readability
                        stroke={12} // Thicker stroke for premium feel
                    />

                    {/* Value positioned absolutely inside the ring */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-[1000] text-white tracking-tighter leading-none">
                            {uv.toFixed(1)}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            Index
                        </span>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}