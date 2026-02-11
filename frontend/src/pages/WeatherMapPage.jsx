import MapLayout from "../components/weather/map/MapLayout";
import useWeatherRuntime from "../hooks/useWeatherRuntime";
import useMapWeather from "../hooks/useMapWeather";

export default function WeatherMapPage() {
    const { city } = useWeatherRuntime();

    const map = useMapWeather();

    return (
        <MapLayout
            city={city}
            {...map}
        />
    );
}
