export function getDaySegments(hourly, sunrise, sunset) {
    const sunriseHour = sunrise.getHours();
    const sunsetHour = sunset.getHours();

    const segments = {
        morning: null,
        afternoon: null,
        evening: null,
        night: null,
    };

    hourly.forEach((h, index) => {
        const hour = h.time.getHours();

        if (hour >= sunriseHour && hour < sunriseHour + 4 && segments.morning === null) {
            segments.morning = index;
        }

        if (hour >= sunriseHour + 4 && hour < sunsetHour && segments.afternoon === null) {
            segments.afternoon = index;
        }

        if (hour >= sunsetHour && hour < sunsetHour + 3 && segments.evening === null) {
            segments.evening = index;
        }

        if (
            (hour >= sunsetHour + 3 || hour < sunriseHour) &&
            segments.night === null
        ) {
            segments.night = index;
        }
    });

    return segments;
}
