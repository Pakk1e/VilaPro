import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";
import { getStatusConfig } from "../utils/weatherMetricsHelper";


export default function RainMetric({ chance }) {
    // Standardizing the status threshold to match the high-end UI feel
    const status = chance > 50 ? "High" : chance > 20 ? "Moderate" : "Low";
    const { color, bgClass } = getStatusConfig(status);

    return (
        <MetricTile
            label="Rain Chance"
            sub={
                <span className={`${bgClass} px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider`}>
                    {status}
                </span>
            }
        >
            {/* Centered Content Area: 
                Using flex-1 ensures it fills the space between the header and bottom of the tile.
            */}
            <div className="flex-1 flex flex-col items-center justify-center relative mt-2">

                <div className="relative w-32 h-32 flex items-center justify-center">
                    <MetricRing
                        value={chance}
                        color={color}
                        size={120} // Fixed: matches PollutantMetric
                        stroke={10} // Fixed: matches PollutantMetric
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                        <span className="text-3xl font-[1000] text-white tracking-tighter">
                            {chance}%
                        </span>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}