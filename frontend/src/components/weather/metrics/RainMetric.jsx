import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";

export default function RainMetric({ chance }) {
    // Standardizing the status threshold to match the high-end UI feel
    const status = chance > 50 ? "High" : chance > 20 ? "Moderate" : "Low";

    return (
        <MetricTile label="Rain Chance" sub={status}>
            {/* Centered Content Area: 
                Using flex-1 ensures it fills the space between the header and bottom of the tile.
            */}
            <div className="flex-1 flex flex-col items-center justify-center relative mt-2">

                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Standardized Ring Size to 96 to match Cloud and UV refactors */}
                    <MetricRing
                        value={chance}
                        color="#38BDF8" // Using a sky-blue for rain to differentiate from Cloud mint
                        size={160}
                        stroke={12}
                    />

                    {/* Centered Data Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-[1000] text-white tracking-tighter leading-none">
                            {chance}%
                        </span>
                        <span className="text-[9px] font-black text-slate-500 uppercase mt-1 tracking-widest">
                            Probability
                        </span>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}