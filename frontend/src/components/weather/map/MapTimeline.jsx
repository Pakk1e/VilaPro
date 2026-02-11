export default function MapTimeline({ timeIndex, setTimeIndex }) {
    return (
        <div className="bg-[#0F172A]/90 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 shadow-xl min-w-[360px]">
            <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-[#2DD4BF]">
                    +{timeIndex}h
                </span>

                <input
                    type="range"
                    min="0"
                    max="24"
                    step="3"
                    value={timeIndex}
                    onChange={(e) => setTimeIndex(parseInt(e.target.value))}
                    className="flex-1"
                />
            </div>
        </div>
    );
}
