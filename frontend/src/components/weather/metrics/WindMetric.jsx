import MetricTile from "./MetricTile";

export default function WindMetric({ speed }) {
    // 1. Progress: Assuming 50km/h is 100% for the visual bar
    const maxWind = 50;
    const percentage = Math.min((speed / maxWind) * 100, 100);

    // 2. Dynamic status
    const status = speed > 30 ? "High" : speed > 15 ? "Moderate" : "Steady";

    return (
        <MetricTile label="Wind Speed" sub={status}>
            <div className="flex-1 flex flex-col items-center justify-center mt-2">

                {/* Value & Label Group */}
                <div className="flex flex-col items-center mb-6">
                    <span className="text-5xl font-[1000] text-white tracking-tighter leading-none">
                        {speed}
                    </span>
                    <span className="text-[10px] font-black text-slate-500 uppercase mt-2 tracking-[0.2em]">
                        km/h
                    </span>
                </div>

                {/* Progressive Wave Container */}
                <div className="w-32 h-12 bg-white/5 rounded-full overflow-hidden relative flex items-center justify-center">

                    {/* 1. The Wrapper for both layers to ensure they share the same '0,0' coordinate */}
                    <div className="relative w-28 h-auto flex items-center">

                        {/* 2. Background "Track" (Ghost wave) */}
                        <svg viewBox="0 0 80 30" className="w-full h-auto opacity-10">
                            <path
                                d="M0 15 Q 10 5, 20 15 T 40 15 T 60 15 T 80 15"
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth="6"
                                strokeLinecap="round"
                            />
                        </svg>

                        {/* 3. The Sliding Mask (The "clipper") */}
                        <div
                            className="absolute inset-0 overflow-hidden transition-all duration-1000 ease-out border-r border-[#2DD4BF]/40 flex items-center"
                            style={{ width: `${percentage}%` }}
                        >
                            {/* 4. The Active Wave - Uses w-[112px] (which is w-28) to match the track exactly */}
                            <svg
                                viewBox="0 0 80 30"
                                className="w-28 h-auto flex-shrink-0 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                            >
                                <path
                                    d="M0 15 Q 10 5, 20 15 T 40 15 T 60 15 T 80 15"
                                    fill="none"
                                    stroke="#2DD4BF"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </MetricTile>
    );
}