import { useEffect, useState } from "react";

/**
 * Normalized weather hook using Open-Meteo
 * Single source of truth for WeatherPage
 */
export function useWeather({ name, lat, lon, country }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!lat || !lon) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchWeather = async (tz = "auto") => {
            setLoading(true);
            setError(null);

            try {
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lon);
                if (isNaN(latitude) || isNaN(longitude)) {
                    throw new Error("Invalid coordinates");
                }

                const url = new URL("https://api.open-meteo.com/v1/forecast");
                url.search = new URLSearchParams({
                    latitude: lat,
                    longitude: lon,
                    timezone: tz,

                    current: [
                        "temperature_2m",
                        "apparent_temperature",
                        "weather_code",
                        "wind_speed_10m",
                        "relative_humidity_2m",
                        "surface_pressure",
                        "cloud_cover"
                    ].join(","),


                    hourly: [
                        "temperature_2m",
                        "precipitation_probability",
                        "weather_code",
                        "cloud_cover",
                        "relative_humidity_2m",
                        "wind_speed_10m",
                        "surface_pressure"
                    ].join(","),

                    daily: [
                        "sunrise",
                        "sunset",
                        "uv_index_max",
                        "temperature_2m_max",
                        "weather_code"
                    ].join(","),


                    forecast_days: 8
                });

                const res = await fetch(url.toString());
                if (!res.ok && tz === "auto") {
                    return fetchWeather("GMT");
                }

                if (!res.ok) {
                    // Log the actual error body from the API to see what's wrong
                    const errorData = await res.json();
                    console.error("Open-Meteo Error:", errorData);
                    throw new Error(errorData.reason || "Weather API request failed");
                }

                const raw = await res.json();
                if (cancelled) return;

                const now = new Date(raw.current.time);

                // ---- NORMALIZATION ----
                const normalized = {
                    location: {
                        name,
                        country,
                        lat,
                        lon,
                        timezone: raw.timezone
                    },

                    current: {
                        temperature: Math.round(raw.current.temperature_2m),
                        feelsLike: Math.round(raw.current.apparent_temperature),
                        condition: mapWeatherCode(raw.current.weather_code).label,
                        icon: mapWeatherCode(raw.current.weather_code).icon,
                        windSpeed: Math.round(raw.current.wind_speed_10m),
                        humidity: raw.current.relative_humidity_2m,
                        pressure: Math.round(raw.current.surface_pressure),
                        cloudCover: raw.current.cloud_cover ?? 0,
                        uvIndex: raw.daily.uv_index_max[0],
                        precipitationChance:
                            raw.hourly.precipitation_probability[0] ?? 0,
                        updatedAt: now
                    },


                    hourly: raw.hourly.time.map((time, i) => ({
                        time: time,
                        formattedTime: new Intl.DateTimeFormat('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: raw.timezone
                        }).format(new Date(time)),
                        temperature: Math.round(raw.hourly.temperature_2m[i]),
                        humidity: raw.hourly.relative_humidity_2m[i],
                        windSpeed: Math.round(raw.hourly.wind_speed_10m[i]),
                        pressure: Math.round(raw.hourly.surface_pressure[i]),
                        precipitationChance:
                            raw.hourly.precipitation_probability[i] ?? 0,
                        ...mapWeatherCode(raw.hourly.weather_code[i])
                    })),

                    daily: {
                        sunrise: new Date(raw.daily.sunrise[0]),
                        sunset: new Date(raw.daily.sunset[0]),
                    },

                    dailyForecast: raw.daily.time.map((time, i) => ({
                        date: new Date(time),
                        temperature: Math.round(raw.daily.temperature_2m_max[i]),
                        icon: mapWeatherCode(raw.daily.weather_code[i]).icon,
                    })),
                };

                setData(normalized);
            } catch (err) {
                console.error(err);
                setError(err.message || "Failed to load weather");
            } finally {
                setLoading(false);
            }
        }

        fetchWeather();

        return () => {
            cancelled = true;
        };
    }, [name, lat, lon, country]);

    return { data, loading, error };
}

/**
 * Weather code normalization
 * https://open-meteo.com/en/docs
 */
function mapWeatherCode(code) {
    const mapping = {
        0: { label: "Clear sky", icon: "clear" },
        1: { label: "Mainly clear", icon: "partly-cloudy" },
        2: { label: "Partly cloudy", icon: "partly-cloudy" },
        3: { label: "Overcast", icon: "overcast" },
        45: { label: "Fog", icon: "fog" },
        48: { label: "Depositing rime fog", icon: "fog" },
        51: { label: "Light drizzle", icon: "drizzle-light" },
        53: { label: "Moderate drizzle", icon: "drizzle-med" },
        55: { label: "Dense drizzle", icon: "drizzle-heavy" },
        56: { label: "Light freezing drizzle", icon: "freezing-rain" },
        57: { label: "Dense freezing drizzle", icon: "freezing-rain" },
        61: { label: "Slight rain", icon: "rain-light" },
        63: { label: "Moderate rain", icon: "rain-med" },
        65: { label: "Heavy rain", icon: "rain-heavy" },
        66: { label: "Light freezing rain", icon: "freezing-rain" },
        67: { label: "Heavy freezing rain", icon: "freezing-rain" },
        71: { label: "Slight snow fall", icon: "snow-light" },
        73: { label: "Moderate snow fall", icon: "snow-med" },
        75: { label: "Heavy snow fall", icon: "snow-heavy" },
        77: { label: "Snow grains", icon: "snow-med" },
        80: { label: "Slight rain showers", icon: "showers-light" },
        81: { label: "Moderate rain showers", icon: "showers-med" },
        82: { label: "Violent rain showers", icon: "showers-heavy" },
        85: { label: "Slight snow showers", icon: "snow-showers" },
        86: { label: "Heavy snow showers", icon: "snow-showers" },
        95: { label: "Thunderstorm", icon: "storm" },
        96: { label: "Storm with slight hail", icon: "storm-hail" },
        99: { label: "Storm with heavy hail", icon: "storm-hail" }
    };
    return mapping[code] || { label: "Cloudy", icon: "overcast" }; // Safe fallback
}
