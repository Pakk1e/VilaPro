// CloudMetric.jsx refactor
import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";
import { getStatusConfig } from "../utils/weatherMetricsHelper";



export default function CloudMetric({ coverage }) {
    const status = coverage > 70 ? "High" : coverage > 30 ? "Partial" : "Clear";
    const { color, bgClass } = getStatusConfig(status)

    return (
        <MetricTile
            label="Cloud Cover"
            sub={
                <span className={`${bgClass} px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-colors duration-500`}>
                    {status}
                </span>
            }
        >
            {/* Centered Ring Container */}
            <div className="flex-1 flex items-center justify-center relative mt-2">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <MetricRing value={coverage} color={color} size={120} stroke={10} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="text-3xl font-[1000] text-white tracking-tighter">
                            {coverage}%
                        </span>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}