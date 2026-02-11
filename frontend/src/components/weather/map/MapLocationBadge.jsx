export default function MapLocationBadge({ city, isWeatherLoading }) {
    const cityName = city?.name ?? "Unknown Location";

    return (
        <div className="bg-[#0F172A]/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center gap-3">
                <div
                    className={`w-2 h-2 rounded-full ${isWeatherLoading ? "bg-orange-400 animate-pulse" : "bg-[#2DD4BF]"
                        }`}
                />
                <span className="text-white text-sm font-semibold">{cityName}</span>
            </div>
        </div>
    );
}
