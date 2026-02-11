const layers = [
    { id: "precipitation", label: "Rain & Snow", icon: "🌧️" },
    { id: "cloud_cover", label: "Cloud Cover", icon: "☁️" },
    { id: "temperature_2m", label: "Temperature", icon: "🌡️" },
    { id: "wind_speed_10m", label: "Wind Speed", icon: "💨" },
];

export default function MapLayers({ activeLayer, setActiveLayer }) {
    return (
        <div className="bg-[#0F172A]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl w-[260px]">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-3">
                Atmospheric Data
            </p>

            <div className="space-y-2">
                {layers.map((layer) => (
                    <button
                        key={layer.id}
                        onClick={() => setActiveLayer(layer.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${activeLayer === layer.id
                                ? "bg-[#2DD4BF]/10 text-[#2DD4BF]"
                                : "text-slate-300 hover:bg-white/5"
                            }`}
                    >
                        <span>{layer.icon}</span>
                        <span>{layer.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
