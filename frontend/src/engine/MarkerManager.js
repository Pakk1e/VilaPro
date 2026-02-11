export default class MarkerManager {
    constructor() {
        this.markers = [
            { id: 1, lat: 51.5074, lon: -0.1278, label: "London" },
            { id: 2, lat: 40.7128, lon: -74.0060, label: "New York" },
            { id: 3, lat: 48.8566, lon: 2.3522, label: "Paris" }
        ];
    }

    // Convert Lat/Lon to 0.0 - 1.0 World Coordinates
    project(lat, lon) {
        const x = (lon + 180) / 360;
        const latRad = lat * Math.PI / 180;
        const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
        return { x, y };
    }
}