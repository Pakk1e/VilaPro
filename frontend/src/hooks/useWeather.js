import { useEffect, useState } from "react";

const OFFICE_LAT = 48.1415;   // <-- CHANGE if needed
const OFFICE_LON = 17.1205;  // <-- CHANGE if needed
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

export function useWeather(enabled) {
  const [status, setStatus] = useState("loading"); // loading | ready | offline
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const cached = sessionStorage.getItem("parkpro_weather");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < REFRESH_INTERVAL) {
        setData(parsed.data);
        setStatus("ready");
        return;
      }
    }

    const fetchWeather = async () => {
      try {
        setStatus("loading");

        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${OFFICE_LAT}` +
          `&longitude=${OFFICE_LON}` +
          `&current=temperature_2m,weather_code` +
          `&hourly=temperature_2m,precipitation,weather_code` +
          `&daily=weather_code,temperature_2m_min,temperature_2m_max` +
          `&forecast_days=14` +
          `&timezone=auto`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather fetch failed");

        const json = await res.json();
        sessionStorage.setItem(
          "parkpro_weather",
          JSON.stringify({ data: json, ts: Date.now() })
        );

        setData(json);
        setStatus("ready");
      } catch {
        setStatus("offline");
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled]);

  return { status, data };
}
