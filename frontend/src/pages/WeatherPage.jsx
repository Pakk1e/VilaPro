import PageHeader from "../components/PageHeader";
import CityModal from "../components/CityModal";
import { useWeather } from "../hooks/useWeather";
import { useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  } catch {
    return CITIES[0];
  }
}

function saveCity(city) {
  localStorage.setItem("weather_city", JSON.stringify(city));
}

/* ------------------ PAGE ------------------ */

export default function WeatherPage() {
  const [city, setCity] = useState(loadCity);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const { data, loading, error } = useWeather(city);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <PageHeader title="Weather" />
        <div className="mt-12 text-center text-slate-500 font-semibold">
          Loading weather…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <PageHeader title="Weather" />
        <div className="mt-12 text-center text-red-500 font-semibold">
          Failed to load weather
        </div>
      </div>
    );
  }

  const { current, hourly, daily, location } = data;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <PageHeader title="Weather" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* HERO */}
        <section className="lg:col-span-1">
          <div className="bg-gradient-to-b from-blue-700 via-blue-600 to-blue-500 text-white rounded-3xl p-6 h-full flex flex-col justify-between shadow">

            <div>
              <p className="text-sm opacity-80">City</p>
              <button
                onClick={() => setShowCityPicker(true)}
                className="text-lg font-semibold flex items-center gap-2 hover:opacity-90"
              >
                <span className="text-white/80">📍</span>
                {location.name}
                <span className="opacity-70">⌄</span>
              </button>

            </div>

            <div className="mt-10">
              <p className="text-7xl font-bold">{current.temperature}°</p>
              <p className="mt-2 text-lg">{current.condition}</p>
              <p className="text-base text-white/90">
                Feels like {current.feelsLike}°
              </p>
            </div>

            <div className="mt-10 text-base text-white/90">
              Updated at{" "}
              {current.updatedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="lg:col-span-2 flex flex-col gap-6">

          {/* HOURLY */}
          <div className="bg-white rounded-3xl p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Upcoming hours</h2>

            <div className="flex gap-4 overflow-x-auto pb-2">
              {hourly.slice(0, 12).map((h, index) => (
                <div
                  key={h.time.toISOString()}
                  className={`min-w-[80px] rounded-xl p-3 text-center transition
                  ${index === 0
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-slate-100 hover:bg-slate-200"}
                  `}
                >
                  <p className="text-sm text-slate-500">
                    {index === 0
                      ? "Now"
                      : h.time.toLocaleTimeString([], { hour: "2-digit" })}
                  </p>

                  <div className="my-2 text-xl">
                    {h.icon === "rain"
                      ? "🌧"
                      : h.icon === "cloudy"
                        ? "☁️"
                        : h.icon === "partly-cloudy"
                          ? "⛅"
                          : "☀️"}
                  </div>
                  <p className="font-semibold">{h.temperature}°</p>
                </div>
              ))}
            </div>

            <div className="mt-6 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={hourly.slice(0, 12).map((h) => ({
                    time: h.time.toLocaleTimeString([], { hour: "2-digit" }),
                    temp: h.temperature,
                  }))}
                >
                  <XAxis dataKey="time" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    strokeOpacity={0.85}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />

                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat icon="🌬" label="Wind" value={`${current.windSpeed} km/h`} />
            <Stat icon="💧" label="Humidity" value={`${current.humidity}%`} />
            <Stat icon="☀️" label="UV Index" value={`${current.uvIndex}`} highlight />
            <Stat icon="🌧" label="Chance of rain" value={`${current.precipitationChance}%`} highlight />
            <Stat icon="🌡" label="Feels like" value={`${current.feelsLike}°`} />
            <Stat
              label="Sunrise / Sunset"
              value={`${daily.sunrise.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })} / ${daily.sunset.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`}
            />
          </div>

        </section>
      </div>

      {/* CITY MODAL */}
      <CityModal
        isOpen={showCityPicker}
        cities={CITIES}
        selectedCity={city}
        onSelect={(c) => {
          setCity(c);
          saveCity(c);
          setShowCityPicker(false);
        }}
        onClose={() => setShowCityPicker(false)}
      />

    </div>
  );
}

/* ------------------ SMALL COMPONENT ------------------ */

function Stat({ icon, label, value, highlight }) {
  return (
    <div
      className={`rounded-2xl p-4 shadow transition
        ${highlight ? "bg-blue-50" : "bg-white"}
      `}
    >
      <p className="text-sm text-slate-500 flex items-center gap-2">
        <span>{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

