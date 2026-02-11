const WeatherLegend = ({ min = -30, max = 50 }) => {
    const gradient = "linear-gradient(to right, #602191, #2b3181, #1e6bb3, #39b6c0, #ffffff, #87cc66, #f5e840, #f28c33, #e83a25, #5a021a)";
    const labels = [-30, -10, 0, 10, 30, 50];

    return (
        <div className="bg-[#0F172A]/95 backdrop-blur-2xl p-4 rounded-[1.5rem] border border-white/20 shadow-2xl w-72">
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                    {/* Using Cyan accent for the title to pop against the dark theme */}
                    <span className="text-[10px] font-black text-[#2DD4BF] tracking-widest uppercase">Temperature</span>
                    <span className="text-[10px] font-bold text-white/70">°C</span>
                </div>

                <div className="relative h-6 flex items-center">
                    {/* Gradient Bar with a slight inner glow */}
                    <div
                        className="w-full h-3 rounded-full border border-white/10 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]"
                        style={{ background: gradient }}
                    />

                    {/* Numbers with heavy drop shadows for extreme readability */}
                    <div className="absolute inset-0 flex justify-between items-center px-1">
                        {labels.map(l => (
                            <span key={l} className="text-[10px] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,1)]">
                                {l}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherLegend;