import React, { useEffect, useState } from "react";
import { WeatherIcon } from "./WeatherIcon.jsx";
import { UVGauge, HumidityBar, AQIBadge } from "./weatherGauges";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from "recharts";

function getWeekday(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short"
    });
}

function weatherDescription(code) {
    if (code === 0) return "Clear sky";
    if ([1, 2].includes(code)) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if ([61, 63, 65].includes(code)) return "Rain";
    if ([71, 73, 75].includes(code)) return "Snow";
    return "Cloudy";
}

function SunProgress({ sunrise, sunset }) {
    if (!sunrise || !sunset) return null;

    const now = new Date();
    const start = new Date(sunrise);
    const end = new Date(sunset);

    const progress = Math.min(
        100,
        Math.max(0, ((now - start) / (end - start)) * 100)
    );

    return (
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
                className="h-full bg-yellow-400"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}






export default function WeatherModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const [query, setQuery] = useState("Bratislava");
    const [coords, setCoords] = useState(null);
    const [weather, setWeather] = useState(null);
    const [air, setAir] = useState(null);
    const [view, setView] = useState("week");
    const [loading, setLoading] = useState(true);
    const [showHourly, setShowHourly] = useState(false);

    const now = new Date();
    const sunset = new Date(weather?.daily?.sunset?.[0]);
    const daylightMinutesLeft = Math.max(0, Math.round((sunset - now) / 60000));
    const daylightHours = Math.floor(daylightMinutesLeft / 60);
    const daylightMinutes = daylightMinutesLeft % 60;
    const isAfterSunset = daylightMinutesLeft === 0;





    const precipitationChance = weather?.hourly?.precipitation_probability?.[0] ?? 0;

    const resolvedCondition = (() => {
        const code = weather?.current?.weather_code;

        if (precipitationChance === 0) {
            // Force non-precipitating language
            if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
                return "Cloudy";
            }
        }

        return weatherDescription(code);
    })();



    const today = new Date().toISOString().slice(0, 10);

    const todayHourly = weather?.hourly?.time
        ?.map((time, i) => ({
            time: time.slice(11, 16),
            temp: weather.hourly.temperature_2m[i],
            isToday: time.startsWith(today),
            isNow:
                time.startsWith(today) &&
                Math.abs(new Date(time) - new Date()) < 30 * 60 * 1000
        }))
        ?.filter(h => h.isToday) ?? [];

    const nowIndex = todayHourly.findIndex(h => h.isNow);
    const visibilityRisk = weather?.hourly?.visibility?.[0] < 5000;
    const aqiRisk = air?.hourly?.us_aqi?.[0] > 100;

    const temps = todayHourly.map(h => h.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);



    async function searchCity(name) {
        setLoading(true);

        const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${name}&count=1`
        );
        const json = await res.json();

        if (json.results?.length) {
            const { latitude, longitude, name, country } = json.results[0];
            setCoords({ latitude, longitude, label: `${name}, ${country}` });
        }

        setLoading(false);
    }

    useEffect(() => {
        if (!coords) return;

        async function fetchWeather() {
            setLoading(true);

            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast
                ?latitude=${coords.latitude}
                &longitude=${coords.longitude}
                &current=temperature_2m,apparent_temperature,weather_code
                &hourly=temperature_2m,relativehumidity_2m,visibility,windspeed_10m,precipitation_probability
                &daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset
                &windspeed_unit=kmh
                &timezone=auto`
                    .replace(/\s+/g, "")
            );




            const aq = await fetch(
                `https://air-quality-api.open-meteo.com/v1/air-quality
                ?latitude=${coords.latitude}
                &longitude=${coords.longitude}
                &hourly=us_aqi`
                    .replace(/\s+/g, "")
            );

            try {
                const weatherJson = await res.json();
                setWeather(weatherJson);

                const airJson = await aq.json();
                setAir(airJson);
            } catch (err) {
                console.error("Weather fetch failed", err);
            } finally {
                setLoading(false);
            }
        }

        setLoading(true);
        fetchWeather();
    }, [coords]);

    useEffect(() => {
        searchCity("Bratislava");
    }, []);


    useEffect(() => {
        function handleKey(e) {
            if (e.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);


    if (loading || !weather || !weather.current || !weather.hourly || !weather.daily) {
        return (
            <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center">
                <div className="bg-white rounded-2xl px-8 py-6 shadow-xl text-slate-600 text-sm font-medium">
                    Loading weather…
                </div>
            </div>
        );
    }


    const visibilityKm = (weather?.hourly?.visibility?.[0] ?? Infinity) / 1000;
    const aqi = air?.hourly?.us_aqi?.[0] ?? 0;
    const rainChance = weather?.hourly?.precipitation_probability?.[0] ?? 0;
    const wind = weather?.hourly?.windspeed_10m?.[0] ?? 0;

    let visitImpact = null;

    if (visibilityKm < 5) {
        visitImpact = {
            title: "Reduced visibility",
            message: "Low visibility may slow arrivals and parking today."
        };
    } else if (aqi > 100) {
        visitImpact = {
            title: "Air quality advisory",
            message: "Poor air quality may affect outdoor activity."
        };
    } else if (rainChance > 40) {
        visitImpact = {
            title: "Rain expected",
            message: "Rain may increase arrival and parking time."
        };
    } else if (wind > 30) {
        visitImpact = {
            title: "Windy conditions",
            message: "Strong winds may affect outdoor movement."
        };
    }

    const effectiveWeatherCode = visibilityKm < 5 ? "fog" : weather?.current?.weather_code;






    return (
        <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center">
            {/* MODAL */}
            <div className="w-[92vw] h-[88vh] bg-[#f7f7f9] rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
                {/* ===== MODAL HEADER ===== */}
                <div className="w-full flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-sm">

                    {/* TITLE */}
                    <div className="leading-tight">
                        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                            {coords?.label ?? "Office"}
                        </h1>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                            Office location · Updated just now
                        </div>
                    </div>




                    {/* ACTIONS */}
                    <div className="flex items-center gap-6">

                        {/* SEARCH */}
                        <div className="flex flex-col w-[240px]">
                            <label className="text-xs text-slate-600 mb-1">
                                Office location
                            </label>

                            <div className="flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-xl focus-within:ring-2 focus-within:ring-blue-500">
                                <span className="text-slate-400">🔍</span>
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && searchCity(query)}
                                    placeholder="Search city or ZIP"
                                    className="bg-transparent outline-none text-sm w-full"
                                />
                            </div>

                            {query && (
                                <div className="text-[11px] text-slate-500 mt-1">
                                    Updates office weather
                                </div>
                            )}

                        </div>


                        {/* VIEW TOGGLE */}
                        <div className="flex gap-3 text-xs font-medium text-slate-500">
                            <button
                                className={
                                    view === "today"
                                        ? "text-slate-700 underline underline-offset-4"
                                        : "text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                                }
                                onClick={() => setView("today")}
                            >
                                Today
                            </button>

                            <button
                                className={view === "week" ? "text-slate-700 underline underline-offset-4" : "text-slate-400"}
                                onClick={() => setView("week")}
                            >
                                7-day outlook
                            </button>
                        </div>

                        {/* UNIT */}
                        <div
                            tabIndex={0}
                            className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            °C
                        </div>



                        {/* CLOSE */}
                        <button
                            onClick={onClose}
                            aria-label="Close weather modal"
                            className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400 transition ml-2 focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            ✕
                        </button>


                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">


                    {/* LEFT SIDEBAR */}
                    <aside className="w-[340px] bg-white p-6 flex flex-col justify-between">
                        {/* ===== CURRENT CONDITIONS ===== */}
                        <div className="flex flex-col h-full justify-between">

                            {/* TOP: current conditions */}
                            <div>

                                {/* Weather icon */}
                                <div className="mb-2 scale-90 origin-left">
                                    <WeatherIcon
                                        code={
                                            precipitationChance === 0
                                                ? 3 // generic cloudy
                                                : effectiveWeatherCode
                                        }
                                    />
                                </div>


                                {/* Temperature */}
                                <div className="text-5xl font-bold text-slate-900 leading-none">
                                    {Math.round(weather?.current?.temperature_2m)}°C
                                </div>

                                {Math.round(weather?.current?.temperature_2m) !==
                                    Math.round(weather?.current?.apparent_temperature ?? weather?.current?.temperature_2m) && (
                                        <div className="text-sm text-slate-500 mt-1">
                                            Feels like {Math.round(weather?.current?.apparent_temperature)}°C
                                        </div>
                                    )}


                                {/* Condition */}
                                <div className="mt-3 text-base font-medium text-slate-700">
                                    {resolvedCondition}
                                </div>


                                {/* Precipitation */}
                                <div className="mt-0.5 text-sm text-slate-500">
                                    {weather.hourly.precipitation_probability?.[0] === 0
                                        ? "No rain expected"
                                        : `Precipitation chance: ${weather.hourly.precipitation_probability[0]}%`}
                                </div>

                            </div>

                            
                        </div>
                    </aside>


                    {view === "today" && visitImpact && (
                        <div className="px-10 py-3 bg-slate-50 border-b border-slate-200">
                            <div className="text-sm font-medium text-slate-900">
                                {visitImpact.title}
                            </div>
                            <div className="text-sm text-slate-600">
                                {visitImpact.message}
                            </div>
                        </div>
                    )}


                    {/* RIGHT CONTENT */}
                    <main className="flex-1 p-10 overflow-y-auto">
                        {/* TOP BAR */}


                        {/* WEEK FORECAST */}
                        {view === "week" && (
                            <section className="mb-8 opacity-90">
                                <div className="flex gap-4">
                                    {weather?.daily?.time?.slice(0, 7).map((date, i) => {
                                        const isToday = i === 0;
                                        const min = Math.round(weather.daily.temperature_2m_min[i]);
                                        const max = Math.round(weather.daily.temperature_2m_max[i]);

                                        return (
                                            <div
                                                key={date}
                                                className={`w-[104px] rounded-2xl p-4 text-center transition
                                            ${isToday ? "bg-white shadow border border-slate-200" : "bg-slate-50 text-slate-400"}`}
                                            >
                                                {/* DAY */}
                                                <div className={`text-sm font-medium mb-1.5 ${isToday ? "text-slate-900" : "text-slate-500"
                                                    }`}>

                                                    {i === 0 ? "Today" : getWeekday(date)}
                                                </div>

                                                {/* ICON */}
                                                <div className="mb-2 flex justify-center">
                                                    <WeatherIcon code={effectiveWeatherCode} />
                                                </div>

                                                {/* TEMPS */}
                                                <div className="text-sm flex items-baseline justify-center gap-1">
                                                    <span className="text-slate-900 font-semibold">
                                                        {max}°
                                                    </span>
                                                    <span className="text-slate-400 text-xs">
                                                        / {min}°
                                                    </span>
                                                </div>

                                            </div>
                                        );
                                    })}


                                </div>
                            </section>
                        )}

                        {view === "today" && (
                            <section className="mb-8 bg-white rounded-2xl p-6 shadow-sm">
                                {/* HEADER */}
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-slate-700">
                                        Hourly temperature
                                    </h3>

                                    <button
                                        onClick={() => setShowHourly(v => !v)}
                                        className="text-xs text-slate-600 px-2 py-1 rounded hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center gap-1"
                                    >
                                        Hourly temperature
                                        <span className="text-slate-400">
                                            {showHourly ? "▴" : "▾"}
                                        </span>
                                    </button>


                                </div>

                                {/* GRAPH */}
                                {showHourly && todayHourly.length > 0 && (
                                    <ResponsiveContainer width="100%" height={170}>
                                        <LineChart data={todayHourly}>
                                            <defs>
                                                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>

                                            {/* X AXIS — every 3 hours */}
                                            <XAxis
                                                dataKey="time"
                                                tickFormatter={(value, index) =>
                                                    index === 0 || index === todayHourly.length - 1 ? value : ""
                                                }
                                                tick={{ fontSize: 11, fill: "#64748b" }}
                                                tickLine={false}
                                                axisLine={false}
                                            />



                                            {/* Y AXIS — subtle reference */}
                                            <YAxis
                                                domain={[
                                                    Math.floor(minTemp - 1),
                                                    Math.ceil(maxTemp + 1)
                                                ]}
                                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                                width={36}
                                                tickLine={false}
                                                axisLine={false}
                                                unit="°C"
                                            />




                                            {/* TOOLTIP */}
                                            <Tooltip
                                                formatter={(v) => [`${v} °C`, "Hourly temperature"]}
                                                labelFormatter={(l) => `Time: ${l}`}
                                                contentStyle={{
                                                    borderRadius: "8px",
                                                    border: "1px solid #e5e7eb",
                                                    fontSize: "12px",
                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                                                }}

                                            />

                                            {nowIndex >= 0 && (
                                                <ReferenceLine
                                                    x={todayHourly[nowIndex]?.time}
                                                    stroke="#94a3b8"
                                                    strokeDasharray="3 3"
                                                    label={{
                                                        value: "Now",
                                                        position: "top",
                                                        fill: "#64748b",
                                                        fontSize: 11
                                                    }}
                                                />
                                            )}


                                            {/* LINE */}
                                            <Line
                                                type="monotone"
                                                dataKey="temp"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={false}
                                                activeDot={{ r: 5 }}
                                                fill="url(#tempGradient)"
                                            />

                                        </LineChart>
                                    </ResponsiveContainer>
                                )}

                                {/* MIN / MAX SUMMARY */}
                                {todayHourly.length > 0 && (
                                    <div className="text-sm text-slate-500">
                                        Min {Math.min(...todayHourly.map(h => h.temp))}°C ·
                                        Max {Math.max(...todayHourly.map(h => h.temp))}°C
                                    </div>
                                )}

                            </section>
                        )}



                        {/* TODAY'S HIGHLIGHTS */}
                        {view === "today" && (
                            <section>
                                <h3 className="text-base font-bold mb-6">
                                    Today’s Highlights
                                </h3>

                                <div className="grid grid-cols-3 gap-6">
                                    {(aqiRisk || visibilityRisk) && (
                                        <div className="col-span-3 text-xs text-slate-600 mb-1">
                                            Conditions today may affect your visit
                                        </div>
                                    )}


                                    {/* AIR QUALITY — HIGH PRIORITY */}
                                    <div className={`rounded-2xl p-6 ${aqiRisk
                                        ? "bg-red-50 border border-red-200 shadow-md"
                                        : "bg-white shadow-sm"
                                        }`}>

                                        <div className="text-sm text-slate-400 mb-1">
                                            Air Quality <span className="text-xs">(US AQI)</span>
                                        </div>

                                        <AQIBadge value={air?.hourly?.us_aqi?.[0]} />

                                        {air?.hourly?.us_aqi?.[0] > 100 && (
                                            <div className="mt-2 text-xs text-slate-700">
                                                Unhealthy (101–150). Air quality is poor; limit outdoor activity, especially for sensitive groups.
                                            </div>

                                        )}

                                    </div>

                                    {/* VISIBILITY — HIGH PRIORITY */}
                                    <div className={`rounded-2xl p-6 ${visibilityRisk
                                        ? "bg-amber-50 border border-amber-200 shadow-md"
                                        : "bg-white shadow-sm"
                                        }`}>

                                        <div className="text-sm text-slate-400 mb-2">Visibility</div>
                                        <div className="text-3xl font-extrabold text-slate-900">
                                            {Math.round((weather?.hourly?.visibility?.[0] ?? 0) / 1000)} km
                                        </div>

                                        {weather?.hourly?.visibility?.[0] < 5000 && (
                                            <div className="mt-2 text-xs text-amber-700">
                                                Low visibility — caution while driving.
                                            </div>
                                        )}
                                    </div>

                                    {/* WIND */}
                                    <div className="bg-white/70 rounded-2xl p-6 shadow-sm">
                                        <div className="text-sm text-slate-500 mb-2">Wind</div>
                                        <div className="text-xl font-medium text-slate-700">
                                            {Math.round(weather?.hourly?.windspeed_10m?.[0] ?? 0)} km/h
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            Light wind
                                        </div>

                                    </div>

                                    {/* SUNRISE / SUNSET WITH PROGRESS */}
                                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                                        <div className="text-sm text-slate-400 mb-2">Sunrise & Sunset</div>

                                        <div className="text-sm text-slate-700 mb-2">
                                            {weather?.daily?.sunrise?.[0]?.slice(11, 16)} /{" "}
                                            {weather?.daily?.sunset?.[0]?.slice(11, 16)}
                                        </div>

                                        <SunProgress
                                            sunrise={weather?.daily?.sunrise?.[0]}
                                            sunset={weather?.daily?.sunset?.[0]}
                                        />

                                        <div className="mt-2 text-xs text-slate-600">
                                            {isAfterSunset
                                                ? `Sunrise in ${24 - daylightHours - (daylightMinutes > 0 ? 1 : 0)}h ${60 - daylightMinutes}m`
                                                : `Sunset in ${daylightHours}h ${daylightMinutes}m`}
                                        </div>



                                    </div>

                                    {/* HUMIDITY */}
                                    <div className="bg-white/70 rounded-2xl p-6 shadow-sm">
                                        <div className="text-sm text-slate-400 mb-2">Humidity</div>
                                        <HumidityBar value={weather?.hourly?.relativehumidity_2m?.[0]} />
                                        <div className="mt-1 text-xs font-medium text-slate-600">
                                            Very high — air feels damp
                                        </div>


                                    </div>

                                    {/* UV INDEX — LOWER PRIORITY */}
                                    <div className="bg-white/60 rounded-2xl p-6 shadow-sm">
                                        <div className="text-sm text-slate-400 mb-2">UV Index</div>
                                        {weather?.daily?.uv_index_max?.[0] < 3 ? (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                                                Low ({weather?.daily?.uv_index_max?.[0]})
                                            </div>

                                        ) : (
                                            <UVGauge value={weather?.daily?.uv_index_max?.[0]} />
                                        )}

                                    </div>

                                </div>


                            </section>
                        )}

                        <div className="mt-12 pt-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                            <span>
                                Updated just now
                            </span>
                            <span>
                                Source: Open-Meteo
                            </span>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
