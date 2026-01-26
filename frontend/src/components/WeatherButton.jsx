import { WeatherIcon } from "./WeatherIcon";

export default function WeatherButton({ weather, status, onClick, className = "" }) {
  if (status === "loading") {
    return (
      <button className={`opacity-50 ${className}`} disabled>
        ⛅
      </button>
    );
  }

  if (!weather || !weather.current) {
    return (
      <button className={`opacity-30 ${className}`} disabled>
        ⛅
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center ${className}`}
      title="Office weather"
    >
      <WeatherIcon code={weather.current.weather_code} />
    </button>
  );
}
