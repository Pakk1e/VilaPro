import { useEffect, useState } from "react";

/**
 * Normalized weather hook using Open-Meteo
 * Single source of truth for WeatherPage
 */
export function useWeather({ name, lat, lon }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!lat || !lon) return;

        let cancelled = false;

        async function fetchWeather() {
            setLoading(true);
            setError(null);

            try {
                const url = new URL("https://api.open-meteo.com/v1/forecast");
                url.search = new URLSearchParams({
                    latitude: lat,
                    longitude: lon,
                    timezone: "auto",

                    current: [
                        "temperature_2m",
                        "apparent_temperature",
                        "weather_code",
                        "wind_speed_10m",
                        "relative_humidity_2m"
                    ].join(","),

                    hourly: [
                        "temperature_2m",
                        "precipitation_probability",
                        "weather_code"
                    ].join(","),

                    daily: [
                        "sunrise",
                        "sunset",
                        "uv_index_max"
                    ].join(","),

                    forecast_days: 2
                });

                const res = await fetch(url.toString());
                if (!res.ok) {
                    throw new Error("Weather API request failed");
                }

                const raw = await res.json();
                if (cancelled) return;

                const now = new Date(raw.current.time);

                // ---- NORMALIZATION ----
                const normalized = {
                    location: {
                        name,
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
                        uvIndex: raw.daily.uv_index_max[0],
                        precipitationChance:
                            raw.hourly.precipitation_probability[0] ?? 0,
                        updatedAt: now
                    },

                    hourly: raw.hourly.time.map((time, i) => ({
                        time: new Date(time),
                        temperature: Math.round(raw.hourly.temperature_2m[i]),
                        precipitationChance:
                            raw.hourly.precipitation_probability[i] ?? 0,
                        ...mapWeatherCode(raw.hourly.weather_code[i])
                    })),

                    daily: {
                        sunrise: new Date(raw.daily.sunrise[0]),
                        sunset: new Date(raw.daily.sunset[0])
                    }
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
    }, [name, lat, lon]);

    return { data, loading, error };
}

/**
 * Weather code normalization
 * https://open-meteo.com/en/docs
 */
function mapWeatherCode(code) {
    if (code === 0) {
        return { label: "Clear", icon: "clear" };
    }

    if ([1, 2].includes(code)) {
        return { label: "Partly cloudy", icon: "partly-cloudy" };
    }

    if (code === 3) {
        return { label: "Cloudy", icon: "cloudy" };
    }

    if ([51, 53, 55, 61, 63, 65].includes(code)) {
        return { label: "Rain", icon: "rain" };
    }

    if ([71, 73, 75].includes(code)) {
        return { label: "Snow", icon: "snow" };
    }

    if ([95, 96, 99].includes(code)) {
        return { label: "Storm", icon: "storm" };
    }

    return { label: "Unknown", icon: "unknown" };
}
