import { useWeather } from "../hooks/useWeather";
import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";


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

import WeatherDashboard from "../components/weather/dashboards/WeatherDashboard";
import WeatherLayout from "../components/weather/dashboards/WeatherLayout";
import AirQualityDashboard from "../components/weather/dashboards/AirQualityDashboard";
import SettingsDashboard from "../components/weather/dashboards/SettingsDashboard";

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
  const [activeMetric, setActiveMetric] = useState('temperature');
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [subView, setSubView] = useState("primary");
  const [settings, setSettings] = useState(null)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);




  const { user } = useAuth();

  // 1. Pass settings to useWeather so the API knows which units to send


  useEffect(() => {
    apiFetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setSettings(data);
      })
      .catch(err => console.error("Sync error:", err))
      .finally(() => setHasLoadedSettings(true));
  }, []);

  const { data, loading, error } = useWeather(city, settings);

  const updatePersistentSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await apiFetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!hasLoadedSettings || (!data && loading)) {
    return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#2DD4BF]" />
    </div>;
  }

  if (!data) return <div className="min-h-screen bg-[#0F172A]" />;


  const { current, location } = data;



  // 2. Format localized time respecting the timeFormat setting
  const cityTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: settings.timeFormat === '12H', // 🟢 Reactive to settings
    timeZone: data.location.timezone
  });

  const cityDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: data.location.timezone
  });

  const localizedTime = cityTimeFormatter.format(currentTime);

  const cityHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: data.location.timezone || 'UTC'
    }).format(currentTime)
  );

  const isNight = cityHour >= 20 || cityHour < 6;

  // Date Logic
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const dateParts = cityDateFormatter.formatToParts(currentTime);
  const dayVal = parseInt(dateParts.find(p => p.type === 'day').value);
  const monthYearStr = `${dateParts.find(p => p.type === 'month').value} ${dateParts.find(p => p.type === 'year').value}`;
  const finalDateString = `${getOrdinal(dayVal)} ${monthYearStr}`;

  const locationLabel = `${location.name}, ${getCountryShortcut(location.country)}`;
  const isLongName = locationLabel.length > 20;

  return (
    <WeatherLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      subView={subView}
      setSubView={setSubView}
      location={data.location.name}
      temperature={data.current.temperature}
      onCitySelect={(newCity) => {
        setCity(newCity);
        localStorage.setItem("weather_city", JSON.stringify(newCity));
      }}
    >
      {activeTab === "Dashboard" && (
        <WeatherDashboard
          data={data}
          settings={settings} // 🟢 Pass the full settings object
          activeMetric={activeMetric}
          setActiveMetric={setActiveMetric}
          isNight={isNight}
          finalDateString={finalDateString}
          localizedTime={localizedTime}
          locationLabel={locationLabel}
          isLongName={isLongName}
          viewMode={subView}
        />
      )}
      {activeTab === "Air Quality" && (
        <AirQualityDashboard
          city={city}
          standard={settings.aqi_standard}
        />
      )}
      {activeTab === "Settings" && (
        <SettingsDashboard
          settings={settings}
          updateSetting={updatePersistentSetting}
          email={user?.email}
          lastUpdated={data?.current?.updatedAt}
        />
      )}

      {/* Fallback for other tabs */}
      {!["Dashboard", "Air Quality", "Settings"].includes(activeTab) && (
        <div className="col-start-2 row-start-2 flex items-center justify-center bg-white/5 rounded-[4rem]">
          <h2 className="text-3xl font-bold opacity-20">{activeTab} Coming Soon</h2>
        </div>
      )}
    </WeatherLayout>
  );
}