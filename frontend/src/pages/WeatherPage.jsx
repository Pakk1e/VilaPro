import { useWeather } from "../hooks/useWeather";
import { useState, useEffect } from "react";
import WeatherSidePanel from "../components/weather/WeatherSidePanel";
import WeatherNav from "../components/weather/WeatherNav";
import WeeklyForecast from "../components/weather/WeeklyForecast";
import WeatherTopBar from "../components/weather/WeatherTopBar";
import TemperatureDayPartChart from "../components/weather/TemperatureDayPartChart";

import WindMetric from "../components/weather/metrics/WindMetric";
import RainMetric from "../components/weather/metrics/RainMetric";
import UVMetric from "../components/weather/metrics/UVMetric";
import CloudMetric from "../components/weather/metrics/CloudMetric";
import MetricMini from "../components/weather/metrics/MetricMini";
import WeatherIcon from "../components/weather/icons/WeatherIcon";

/* ------------------ CONSTANTS ------------------ */
const CITIES = [
  { name: "Bratislava", lat: 48.1486, lon: 17.1077 },
  { name: "Vienna", lat: 48.2082, lon: 16.3738 },
  { name: "Prague", lat: 50.0755, lon: 14.4378 },
  { name: "Budapest", lat: 47.4979, lon: 19.0402 },
];

/* ------------------ HELPERS ------------------ */
function loadCity() {
  try {
    const stored = localStorage.getItem("weather_city");
    return stored ? JSON.parse(stored) : CITIES[0];
  } catch { return CITIES[0]; }
}

export default function WeatherPage() {
  const [city] = useState(loadCity);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data, loading, error } = useWeather(city);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center font-medium text-slate-400">Loading weather...</div>;
  if (error || !data) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-red-400 font-medium">Failed to load weather</div>;

  const { current, hourly, dailyForecast, location } = data;
  const isNight = currentTime.getHours() >= 20 || currentTime.getHours() < 6;

  // Manual Ordinal logic for "16th January, 2026"
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const day = currentTime.getDate();
  const monthYear = currentTime.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const finalDateString = `${getOrdinal(day)} ${monthYear}`;

  return (
    <div className="h-screen max-h-screen bg-[#0F172A] p-6 lg:p-8 text-white overflow-hidden font-sans">
      <div className="h-full grid grid-cols-[240px_1.6fr_0.8fr] grid-rows-[60px_1fr_200px] gap-6">

        {/* SIDEBAR */}
        <aside className="row-span-3 flex flex-col">
          <WeatherNav />
        </aside>

        {/* TOP BAR */}
        <header className="col-start-2 col-span-2 flex items-center">
          <WeatherTopBar location={location.name} temperature={current.temperature} />
        </header>

        {/* MASTER CARD */}
        <main className="col-start-2 row-start-2 h-full min-h-0">
          <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden flex relative border border-white/50 h-full">

            {/* Left Panel: Scaled UP Hero Content */}
            <div className="w-[32%] flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50 p-10 items-start text-left border-r border-slate-100/50">

              {/* BIGGER ICON */}
              <div className="w-40 h-40 mb4 drop-shadow-2xl">
                <WeatherIcon type={current.icon} size="100%" isNight={isNight} />
              </div>

              {/* BIGGER TEMPERATURE */}
              <div className="w-full">
                <span className="text-[96px] font-[1000] text-[#1E293B] leading-[0.65] tracking-[-0.08em] block">
                  {Math.round(current.temperature)}°
                </span>
              </div>

              {/* BIGGER CITY NAME */}
              <div className="mt-12 w-full">
                <h2 className="text-3xl font-[1000] text-[#1E293B] tracking-tighter leading-tight">
                  {location.name}, {location.countryCode || 'SK'}
                </h2>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
                  Feels like <span className="text-[#2DD4BF] font-[1000]">{Math.round(current.feelsLike)}°</span>
                </p>
              </div>

              {/* TWO ROW DATE/TIME SECTION - Pinned to bottom */}
              <div className="mt-auto w-full space-y-5 pb-3">
                <div className="w-full h-[2px] bg-slate-300" />

                <div className="flex flex-col gap-4">
                  {/* Row 1: Date */}
                  <div className="flex items-center gap-4 text-slate-500">
                    <svg className="w-6 h-6 opacity-60" fill="none" stroke="black" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[16px] font-[700] tracking-tight">
                      {finalDateString}
                    </span>
                  </div>

                  {/* Row 2: Time */}
                  <div className="flex items-center gap-4 text-slate-800">
                    <svg className="w-6 h-6 opacity-60" fill="none" stroke="black" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xl font-[900] tabular-nums">
                      {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Chart Area stays consistent */}
            <div className="flex-1 p-10 flex flex-col h-full bg-[#F8FAFC]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-[1000] text-[#1E293B] tracking-tight">Temperature Flow</h2>
              </div>

              <div className="flex-1 min-h-0 w-full">
                <TemperatureDayPartChart hourly={hourly} currentTemp={current.temperature} />
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 mt-6">
                <MetricMini label="Pressure" icon="pressure" value="1015 hPa" />
                <MetricMini label="Humidity" icon="humidity" value="90%" />
                <MetricMini label="Wind" icon="wind-metric" value="8 km/h" />
              </div>
            </div>
          </div>
        </main>

        {/* BOTTOM METRICS */}
        <div className="col-start-2 row-start-3 grid grid-cols-4 gap-6 self-center">
          <WindMetric speed={current.windSpeed} />
          <RainMetric chance={current.precipitationChance} />
          <UVMetric uv={current.uvIndex} />
          <CloudMetric coverage={current.cloudCover} />
        </div>

        {/* RIGHT FORECAST SIDEBAR */}
        <aside className="col-start-3 row-start-2 row-span-2 bg-[#1E293B]/50 rounded-[3rem] p-8 border border-white/5 flex flex-col h-full overflow-hidden backdrop-blur-md">
          <WeeklyForecast hourly={hourly} daily={dailyForecast} />
        </aside>

      </div>
    </div>
  );
}