import { useEffect, useState } from "react";
import MetricRing from "../metrics/MetricRing";
import PollutantMetric from "../metrics/PollutantMetric";
import HealthAdvisory from "../HealthAdvisory";
import { getPollutantSeverity } from "../../utils/airQualityHelpers";




export default function AirQualityDashboard({ city, standard }) {
    const [aqiData, setAqiData] = useState(null);
    const [activeKey, setActiveKey] = useState("AQI");


    // Map the generic subView 'primary/secondary' to Open-Meteo keys
    const currentStandardKey = standard === "secondary" ? "us_aqi" : "european_aqi";
    const standardLabel = standard === "secondary" ? "USA Standard" : "EU Standard";

    useEffect(() => {
        async function fetchAQI() {
            const res = await fetch(
                `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=european_aqi,us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide&hourly=european_aqi,us_aqi&timezone=auto`
            );
            const data = await res.json();
            setAqiData(data);
        }
        fetchAQI();
    }, [city]);

    if (!aqiData) return <div className="col-start-2 row-start-2 animate-pulse bg-white/5 rounded-[3rem]" />;

    const pollutants = {
        "AQI": {
            label: standard === "secondary" ? "US AQI" : "EU AQI", // Explicit label change
            value: aqiData.current[currentStandardKey],
            unit: "AQI",
            max: standard === "secondary" ? 300 : 100,
            color: "#10B981",
            desc: standard === "secondary"
                ? "US EPA Index (0-500 scale). Values 0-50 are Good, 51-100 Moderate."
                : "European EEA Index (0-100 scale). Based on the most dominant pollutant."
        },
        "PM 2.5": { label: "Fine Particles", value: aqiData.current.pm2_5, unit: "µg/m³", max: 55, color: "#10B981", desc: "PM2.5 particles are small enough to enter the bloodstream and represent the highest health risk." },
        "PM 10": { label: "Coarse Dust", value: aqiData.current.pm10, unit: "µg/m³", max: 150, color: "#10B981", desc: "PM10 includes coarse dust, pollen, and mold. Long term exposure can irritate the respiratory tract." },
        "NO2": { label: <>NO<sub>2</sub></>, value: aqiData.current.nitrogen_dioxide, unit: "µg/m³", max: 200, color: "#10B981", desc: "Nitrogen Dioxide primarily enters the air from burning fuel, especially from vehicle emissions." },
        "O3": { label: <>O<sub>3</sub></>, value: aqiData.current.ozone, unit: "µg/m³", max: 180, color: "#10B981", desc: "Ground-level Ozone is a secondary pollutant created by sunlight reacting with other emissions." },
        "CO": { label: "CO", value: aqiData.current.carbon_monoxide, unit: "µg/m³", max: 15000, color: "#10B981", desc: "Carbon Monoxide is a toxic, odorless gas produced from incomplete combustion." },
        "SO2": { label: <>SO<sub>2</sub></>, value: aqiData.current.sulphur_dioxide, unit: "µg/m³", max: 350, color: "#10B981", desc: "Sulphur Dioxide is a pungent gas produced by industrial activity and coal burning." },
    };

    const currentHero = pollutants[activeKey];
    const severity = getPollutantSeverity(currentHero.label, currentHero.value, currentHero.max, standard);

    return (
        <>
            <main className="col-start-2 row-start-2 h-full flex gap-6 min-h-0">

                {/* HERO SECTION */}
                <div className="w-[42%] bg-[#1E293B]/40 backdrop-blur-md rounded-[3rem] p-12 flex flex-col justify-between border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div
                        className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-1000"
                        style={{ background: `radial-gradient(circle at 50% 50%, ${severity.color} 0%, transparent 80%)` }}
                    />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setActiveKey("AQI")} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeKey === "AQI" ? 'text-[#2DD4BF]' : 'text-slate-500 hover:text-white'}`}>
                                {activeKey !== "AQI" && <span>←</span>} Atmosphere
                            </button>
                            <span className="text-slate-800 text-xs">/</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity duration-500 ${activeKey === "AQI" ? 'opacity-0' : 'opacity-100 text-white'}`}>
                                {currentHero.label}
                            </span>
                        </div>
                        <h2 className="text-5xl font-[1000] text-white tracking-tighter leading-none">{city.name}</h2>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-2 opacity-60">
                            {city.country} • {activeKey === "AQI" ? "Real-time Overview" : "Deep Analysis"}
                        </p>
                    </div>

                    <div className="relative flex flex-col items-center justify-center">
                        <MetricRing value={currentHero.value} max={activeKey === "AQI" ? (standard === "secondary" ? 300 : 100) : currentHero.max} size={280} stroke={20} color={severity.color} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[92px] font-[1000] text-white tracking-tighter leading-none">{Math.round(currentHero.value)}</span>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-3">{currentHero.unit}</span>
                        </div>
                    </div>

                    <div className="relative z-10 pt-8 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inspecting</span>
                                <span className="text-2xl font-[1000] tracking-tighter" style={{ color: severity.color }}>{currentHero.label}</span>
                            </div>
                            <div className={`${severity.bgClass} ${severity.borderClass} border px-3 py-1 rounded-lg transition-all duration-500`}>
                                <span className={`${severity.textClass} text-[10px] font-black uppercase tracking-widest`}>{severity.label}</span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">{currentHero.desc}</p>
                    </div>
                </div>

                {/* MODULAR GRID */}
                <div className="flex-1 grid grid-cols-2 grid-rows-3 gap-4">
                    {Object.keys(pollutants).filter(k => k !== "AQI").map((key) => (
                        <PollutantMetric
                            key={key}
                            label={pollutants[key].label}
                            value={pollutants[key].value}
                            unit={pollutants[key].unit}
                            // Keep this fixed to the pollutant's specific limit
                            max={pollutants[key].max}
                            color={pollutants[key].color}
                            isActive={activeKey === key}
                            onClick={() => setActiveKey(key)}
                            // Pass the standard so the COLOR logic can change
                            standard={standard}
                        />
                    ))}
                </div>
            </main>

            {/* SIDEBAR - Now using the full HealthAdvisory component */}
            <HealthAdvisory
                aqi={aqiData.current[currentStandardKey]} // Use the dynamic key here
                pm2_5={aqiData.current?.pm2_5}
                forecastData={aqiData.hourly[currentStandardKey]} // Use the dynamic key here
                standard={currentStandardKey}
            />
        </>
    );
}