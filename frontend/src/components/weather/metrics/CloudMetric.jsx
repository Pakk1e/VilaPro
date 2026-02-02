// CloudMetric.jsx refactor
import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";

export default function CloudMetric({ coverage }) {
    const status = coverage > 70 ? "High" : coverage > 30 ? "Partial" : "Clear";

    return (
        <MetricTile label="Cloud Cover" sub={status}>
            {/* Centered Ring Container */}
            <div className="flex-1 flex items-center justify-center relative mt-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Ring: Increased size to 96 for better visibility */}
                    <MetricRing value={coverage} color="#2DD4BF" size={160} stroke={12} />

                    {/* Data Overlay: Now perfectly centered */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-[1000] text-white tracking-tighter leading-none">
                            {coverage}%
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase mt-1 tracking-widest">
                            Coverage
                        </span>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}