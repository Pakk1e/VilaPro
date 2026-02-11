import MapLayers from "./MapLayers";
import MapTimeline from "./MapTimeline";
import MapTelemetry from "./MapTelemetry";
import MapLocationBadge from "./MapLocationBadge";
import MapExitButton from "./MapExitButton";
import WeatherLegend from "../../../engine/components/WeatherLegend";

export default function MapHUD({
    city,
    activeLayer,
    setActiveLayer,
    weatherData,
    isWeatherLoading,
    timeIndex,
    setTimeIndex,
}) {
    return (
        <>
            {/* TOP LEFT */}
            <div className="absolute top-6 left-6 z-50">
                <MapLocationBadge city={city} isWeatherLoading={isWeatherLoading} />
            </div>

            {/* TOP RIGHT */}
            <div className="absolute top-6 right-6 z-50">
                <MapTelemetry weatherData={weatherData} />
            </div>

            {/* RIGHT SIDE */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-50">
                <MapLayers
                    activeLayer={activeLayer}
                    setActiveLayer={setActiveLayer}
                />
            </div>

            {/* BOTTOM LEFT */}
            {weatherData && (
                <div className="absolute left-6 bottom-6 z-50">
                    <WeatherLegend
                        min={weatherData?.metadata?.stats?.min ?? -30}
                        max={weatherData?.metadata?.stats?.max ?? 50}
                    />
                </div>
            )}

            {/* BOTTOM CENTER */}
            {weatherData && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <MapTimeline
                        timeIndex={timeIndex}
                        setTimeIndex={setTimeIndex}
                    />
                </div>
            )}

            {/* EXIT */}
            <div className="absolute bottom-6 right-6 z-50">
                <MapExitButton />
            </div>
        </>
    );
}
