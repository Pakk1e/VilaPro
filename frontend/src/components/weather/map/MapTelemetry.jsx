export default function MapTelemetry({ weatherData }) {
    return (
        <div className="bg-[#0F172A]/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shadow-xl min-w-[220px]">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Model
            </p>

            <div className="flex justify-between text-xs">
                <span className="text-slate-400">Source</span>
                <span className="font-mono text-[#2DD4BF]">
                    {weatherData?.metadata?.model || "Loading"}
                </span>
            </div>

            <div className="flex justify-between text-xs mt-1">
                <span className="text-slate-400">Range</span>
                <span className="font-mono text-white">
                    {weatherData?.metadata?.stats?.min} /{" "}
                    {weatherData?.metadata?.stats?.max}
                </span>
            </div>
        </div>
    );
}
