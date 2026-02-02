import { useWeather } from "../hooks/useWeather";
import { useState, useEffect } from "react";


import countriesData from "../components/weather/utils/countries.json";
import WeatherNav from "../components/weather/WeatherNav";
import WeeklyForecast from "../components/weather/WeeklyForecast";
import WeatherTopBar from "../components/weather/WeatherTopBar";
import UniversalWeatherChart from "../components/weather/UniversalWeatherChart";

import WindMetric from "../components/weather/metrics/WindMetric";
import RainMetric from "../components/weather/metrics/RainMetric";
import UVMetric from "../components/weather/metrics/UVMetric";
import CloudMetric from "../components/weather/metrics/CloudMetric";
import MetricMini from "../components/weather/metrics/MetricMini";
import WeatherIcon from "../components/weather/icons/WeatherIcon";

/* ------------------ CONSTANTS ------------------ */
const CITIES = [
  { name: "Bratislava", lat: 48.1486, lon: 17.1077, country: "Slovakia" },
  { name: "Vienna", lat: 48.2082, lon: 16.3738, country: "Austria" },
  { name: "Prague", lat: 50.0755, lon: 14.4378, country: "Czechia" },
  { name: "Budapest", lat: 47.4979, lon: 19.0402, country: "Hungary" },
];



/* ------------------ HELPERS ------------------ */
function loadCity() {
  try {
    const stored = localStorage.getItem("weather_city");
    return stored ? JSON.parse(stored) : CITIES[0];
  } catch { return CITIES[0]; }
}

const getCountryShortcut = (countryName) => {
  if (!countryName) return "---";

  // 1. Handle common edge cases manually for instant fixes
  const overrides = {
    "united states": "USA",
    "united states of america": "USA",
    "united kingdom": "GBR",
    "uae": "ARE",
    "united arab emirates": "ARE"
  };

  const normalizedInput = countryName.toLowerCase().trim();
  if (overrides[normalizedInput]) return overrides[normalizedInput];

  // 2. Try to find the match in your JSON
  const countryObj = countriesData.find(
    (c) => c.name.toLowerCase() === normalizedInput
  );

  if (countryObj) return countryObj["alpha-3"];

  // 3. Last resort fallback: First 3 letters
  return countryName.substring(0, 3).toUpperCase();
};

export default function WeatherPage() {
  const [city, setCity] = useState(loadCity);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMetric, setActiveMetric] = useState('temperature'); // options: 'temperature', 'pressure', 'humidity', 'wind'
  const [isVisuallyLoading, setIsVisuallyLoading] = useState(false);

  const { data, loading, error } = useWeather(city);



  useEffect(() => {
    if (loading) {
      setIsVisuallyLoading(true);
    } else {
      // We only fade out if the API is done AND we've had a moment to show the overlay
      const timer = setTimeout(() => {
        setIsVisuallyLoading(false);
      }, 900); // Increased slightly to ensure the "switch" is hidden
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return <div className="min-h-screen bg-[#0F172A]" />;

  const { current, hourly, dailyForecast, location } = data;

  // inside WeatherPage component


  // Define the available metrics and their data mappings
  const metricConfigs = {
    temperature: { label: 'Temperature', unit: '°', icon: 'temp', key: 'temperature' },
    pressure: { label: 'Pressure', unit: ' hPa', icon: 'pressure', key: 'pressure' },
    humidity: { label: 'Humidity', unit: '%', icon: 'humidity', key: 'humidity' },
    wind: { label: 'Wind Speed', unit: ' km/h', icon: 'wind-metric', key: 'windSpeed' }
  };

  // Determine which 3 metrics should be in the "mini" slots
  const activeConfig = metricConfigs[activeMetric];
  const standbyKeys = Object.keys(metricConfigs).filter(key => key !== activeMetric);

  // Manual Ordinal logic for "16th January, 2026"
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };


  const handleCitySelect = (newCity) => {
    if (newCity.lat === city.lat && newCity.lon === city.lon) {
      setIsVisuallyLoading(false);
      return;
    }
    setIsVisuallyLoading(true);
    setCity(newCity);
    localStorage.setItem("weather_city", JSON.stringify(newCity));
  };

  // Replace your existing localizedTime and localHour logic with this:

  // 1. Create a formatter for the specific city timezone
  const cityTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: data.location.timezone // Use the timezone returned by API
  });

  const cityDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: data.location.timezone
  });

  // 2. Get the current string for that city
  const localizedTime = cityTimeFormatter.format(currentTime);

  // 3. Extract the hour for Night Mode logic
  const cityHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: data.location.timezone || 'UTC'
    }).format(currentTime)
  );

  const isNight = cityHour >= 20 || cityHour < 6;

  // 4. Handle the Date with Ordinals
  const dateParts = cityDateFormatter.formatToParts(currentTime);
  const dayVal = parseInt(dateParts.find(p => p.type === 'day').value);
  const monthYearStr = `${dateParts.find(p => p.type === 'month').value} ${dateParts.find(p => p.type === 'year').value}`;
  const finalDateString = `${getOrdinal(dayVal)} ${monthYearStr}`;

  const locationLabel = `${location.name}, ${getCountryShortcut(location.country)}`;
  const isLongName = locationLabel.length > 20;

  return (


    <div className="h-screen max-h-screen bg-[#0F172A] p-6 lg:p-8 text-white overflow-hidden font-sans">

      {/* GLOBAL FADE OVERLAY */}
      <div
        className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0F172A]/70 backdrop-blur-md transition-all duration-500 ease-in-out ${isVisuallyLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Subtle glowing ring loader */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-[#2DD4BF]/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-[#2DD4BF] rounded-full animate-spin" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#2DD4BF] animate-pulse">
            Updating {location.name}
          </span>
        </div>
      </div>


      <div className={`h-full grid grid-cols-[240px_1.6fr_0.8fr] grid-rows-[60px_1fr_auto] gap-6 transition-opacity duration-300 ${isVisuallyLoading ? "opacity-0" : "opacity-100"
        }`}>
        {/* SIDEBAR */}
        <aside className="row-span-3 flex flex-col">
          <WeatherNav />
        </aside>

        {/* TOP BAR */}
        <header className="col-start-2 col-span-2 flex items-center">
          <WeatherTopBar
            location={location.name}
            temperature={current.temperature}
            onCitySelect={handleCitySelect} // Pass the setter down
            timezone={data.timezone}
          />
        </header>

        {/* MASTER CARD */}
        <main className="col-start-2 row-start-2 h-full min-h-0">
          {error ? (
            <div className="h-full flex flex-col items-center justify-center bg-white/5 rounded-[4rem] border border-white/10">
              <p className="text-red-400 font-bold">Error: {error}</p>
              <button
                onClick={() => handleCitySelect(CITIES[0])}
                className="mt-4 px-6 py-2 bg-[#2DD4BF] text-black rounded-full font-bold"
              >
                Back to Bratislava
              </button>
            </div>
          ) : !data ? (
            <div className="h-full animate-pulse bg-white/5 rounded-[4rem]" />
          ) : (
            <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden flex relative border border-white/50 h-full">

              {/* Left Panel: Scaled UP Hero Content */}
              <div className="w-[32%] flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50 p-10 items-start text-left border-r border-slate-100/50">

                {/* ICON */}
                <div className="w-40 h-40 mb4 drop-shadow-2xl">
                  <WeatherIcon type={current.icon} size="100%" isNight={isNight} />
                </div>

                {/* TEMPERATURE */}
                <div className="w-full">
                  <span className="text-[96px] font-[1000] text-[#1E293B] leading-[0.65] tracking-[-0.08em] block">
                    {Math.round(current.temperature)}°
                  </span>
                </div>

                {/* CITY NAME */}
                <div className="mt-12 w-full">
                  <h2 className={`font-[1000] text-[#1E293B] tracking-tighter leading-tight ${isLongName ? "text-xl" : "text-3xl"} `}>
                    {locationLabel}
                  </h2>


                  {/*Feels Like Temp*/}

                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-4">
                    Feels like <span className="text-[#2DD4BF] font-[1000]">{Math.round(current.feelsLike)}°</span>
                  </p>
                </div>

                {/* TWO ROW DATE/TIME SECTION - Pinned to bottom */}
                <div className="mt-4 w-full space-y-5 pb-3">
                  <div className="w-full h-[2px] bg-slate-300" />

                  <div className="flex flex-col gap-2">
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
                        {localizedTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel: Chart Area stays consistent */}
              <div className="flex-1 p-10 flex flex-col h-full bg-[#F8FAFC]">
                <div className="flex justify-between items-center mb-8">
                  {/* DYNAMIC LABEL BASED ON ACTIVE METRIC */}
                  <h2 className="text-2xl font-[1000] text-[#1E293B] tracking-tight">
                    {activeConfig.label} Forecast
                  </h2>
                </div>

                <div className="flex-1 min-h-0 w-full">
                  <UniversalWeatherChart
                    hourly={hourly}
                    activeMetricId={activeMetric}
                    currentVal={current[activeConfig.key]}
                    timezone={data.location.timezone}
                  />
                </div>

                <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-50 mt-8">
                  {standbyKeys.map((key) => {
                    const config = metricConfigs[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveMetric(key)}
                        className="text-left hover:bg-slate-50 p-2 rounded-xl transition-colors group"
                      >
                        <MetricMini
                          label={config.label}
                          value={`${Math.round(current[config.key])}${config.unit}`}
                          icon={config.icon}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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


          <WeeklyForecast
            hourly={hourly}
            daily={dailyForecast}
            timezone={data.location.timezone} // <--- PASS HERE
          />
        </aside>
      </div >
    </div >

  );
}