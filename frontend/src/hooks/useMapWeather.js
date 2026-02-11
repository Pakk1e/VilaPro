import { useState, useEffect } from "react";

export default function useMapWeather() {
    const [activeLayer, setActiveLayer] = useState("temperature_2m");
    const [weatherData, setWeatherData] = useState(null);
    const [isWeatherLoading, setIsWeatherLoading] = useState(false);
    const [timeIndex, setTimeIndex] = useState(0);

    useEffect(() => {
        setIsWeatherLoading(true);

        fetch(
            `http://localhost:5001/api/weather/raw?hour=${String(timeIndex).padStart(
                3,
                "0"
            )}&type=temp`
        )
            .then((r) => r.arrayBuffer())
            .then((buffer) => {
                let delivered = false;

                const sendToMap = () => {
                    if (delivered) return;

                    if (!window.updateWeatherBinary) {
                        setTimeout(sendToMap, 100);
                        return;
                    }

                    delivered = true;   // 🔥 prevent recursion
                    window.updateWeatherBinary(buffer);
                    setIsWeatherLoading(false);
                };
                sendToMap()

                setWeatherData({
                    metadata: {
                        model: "GFS / ERA5",
                        stats: { min: -15, max: 35 },
                    },
                });
            })
            .catch((err) => {
                console.error("Binary fetch failed", err);
                setIsWeatherLoading(false);
            });
    }, [timeIndex]);

    return {
        activeLayer,
        setActiveLayer,
        weatherData,
        isWeatherLoading,
        timeIndex,
        setTimeIndex,
    };
}
