import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { useWeather } from "./useWeather";

const DEFAULT_SETTINGS = {
    timeFormat: "24H",
    temperatureUnit: "celsius",
    aqi_standard: "european",
};

const CITIES = [
    { name: "Bratislava", lat: 48.1486, lon: 17.1077, country: "Slovakia" },
    { name: "Vienna", lat: 48.2082, lon: 16.3738, country: "Austria" },
    { name: "Prague", lat: 50.0755, lon: 14.4378, country: "Czechia" },
    { name: "Budapest", lat: 47.4979, lon: 19.0402, country: "Hungary" },
];

function loadCity() {
    try {
        const stored = localStorage.getItem("weather_city");
        return stored ? JSON.parse(stored) : CITIES[0];
    } catch {
        return CITIES[0];
    }
}

export default function useWeatherRuntime() {
    const [city, setCity] = useState(loadCity);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        apiFetch("/api/settings")
            .then((res) => res.json())
            .then((data) => {
                if (data && !data.error) setSettings(data);
            })
            .catch((err) => console.error("Sync error:", err))
            .finally(() => setHasLoadedSettings(true));
    }, []);

    const { data, loading, error } = useWeather(city, settings);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const updatePersistentSetting = async (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        await apiFetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value }),
        });
    };

    const selectCity = (newCity) => {
        setCity(newCity);
        localStorage.setItem("weather_city", JSON.stringify(newCity));
    };

    return {
        city,
        setCity: selectCity,
        settings,
        updatePersistentSetting,
        hasLoadedSettings,
        data,
        loading,
        error,
        currentTime,
    };
}
