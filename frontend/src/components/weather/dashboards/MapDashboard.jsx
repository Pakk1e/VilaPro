import React from "react";
import MapEngine from "../../../engine/components/MapEngine";
import WeatherLegend from "../../../engine/components/WeatherLegend";
import useMapWeather from "../../../hooks/useMapWeather";

export default function MapDashboard({ city }) {
    const {
        activeLayer,
        setActiveLayer,
        weatherData,
        isWeatherLoading,
        timeIndex,
        setTimeIndex,
    } = useMapWeather();

    const cityName = city?.name ?? "Unknown Location";

    const layers = [
        { id: "precipitation", label: "Rain & Snow", icon: "🌧️" },
        { id: "cloud_cover", label: "Cloud Cover", icon: "☁️" },
        { id: "temperature_2m", label: "Temperature", icon: "🌡️" },
        { id: "wind_speed_10m", label: "Wind Speed", icon: "💨" },
    ];

    return (
        <main className="h-full w-full flex gap-6 p-8 min-h-0 overflow-hidden box-border bg-[#0B0F1A]">
            {/* MAP */}
            <div className="flex-[3] bg-[#0F172A] rounded-[3.5rem] border border-white/10 overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 z-0">
                    <MapEngine />
                </div>

                {/* LOCATION */}
                <div className="absolute top-8 left-8 z-[1000]">
                    <div className="bg-[#1E293B]/80 px-6 py-4 rounded-[2rem] border border-white/10">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-2 h-2 rounded-full ${isWeatherLoading ? "bg-orange-400" : "bg-[#2DD4BF]"
                                    }`}
                            />
                            <span className="text-white font-bold">{cityName}</span>
                        </div>
                    </div>
                </div>

                {weatherData && (
                    <div className="absolute bottom-12 left-12 z-[1001]">
                        <WeatherLegend
                            min={weatherData?.metadata?.stats?.min ?? -30}
                            max={weatherData?.metadata?.stats?.max ?? 50}
                        />
                    </div>
                )}

                {/* TIMELINE */}
                {weatherData && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[1001]">
                        <input
                            type="range"
                            min="0"
                            max="24"
                            step="3"
                            value={timeIndex}
                            onChange={(e) => setTimeIndex(parseInt(e.target.value))}
                        />
                    </div>
                )}
            </div>

            {/* SIDEBAR */}
            <div className="flex-[1] flex flex-col gap-6 min-w-[320px]">
                <div className="bg-[#1E293B]/40 rounded-[3rem] border border-white/5 p-6">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] px-4 mb-4">
                        Atmospheric Data
                    </p>

                    <div className="space-y-2">
                        {layers.map((layer) => (
                            <button
                                key={layer.id}
                                onClick={() => setActiveLayer(layer.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-[2rem] ${activeLayer === layer.id
                                        ? "bg-[#2DD4BF]/10 text-[#2DD4BF]"
                                        : "bg-white/5 text-slate-400"
                                    }`}
                            >
                                <span>{layer.icon}</span>
                                <span>{layer.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
