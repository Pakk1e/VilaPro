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

import WeatherDashboard from "../components/weather/dashboards/WeatherDashboard";
import WeatherLayout from "../components/weather/dashboards/WeatherLayout";
import AirQualityDashboard from "../components/weather/dashboards/AirQualityDashboard";

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
  const [activeTab, setActiveTab] = useState("Dashboard");

  const { data, loading, error } = useWeather(city);
  const [subView, setSubView] = useState("primary");

  useEffect(() => {
    setSubView("primary");
  }, [activeTab]);


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
    <WeatherLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      subView={subView}
      setSubView={setSubView}
      location={data.location.name}
      temperature={data.current.temperature}
      onCitySelect={handleCitySelect}
    >
      {/* SWITCH CONTENT BASED ON TAB */}
      {activeTab === "Dashboard" && (
        <WeatherDashboard
          data={data}
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
          standard={subView}
        />
      )}

      {/* Fallback for other tabs */}
      {!["Dashboard", "Air Quality"].includes(activeTab) && (
        <div className="col-start-2 row-start-2 flex items-center justify-center bg-white/5 rounded-[4rem]">
          <h2 className="text-3xl font-bold opacity-20">{activeTab} Coming Soon</h2>
        </div>
      )}
    </WeatherLayout>
  );
}