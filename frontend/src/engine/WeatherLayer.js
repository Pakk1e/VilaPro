export default class WeatherLayer {
    constructor() {
        this.data = null;
        this.width = 1440;
        this.height = 721;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
    }

    // Classic "Turbo" style color ramp
    getColor(v) {
        if (v < -20) return [40, 0, 150];    // Deep Purple
        if (v < 0) return [0, 100, 255];   // Blue
        if (v < 15) return [0, 255, 200];   // Teal
        if (v < 25) return [255, 255, 0];   // Yellow
        if (v < 35) return [255, 120, 0];   // Orange
        return [255, 0, 0];                  // Red
    }

    setData(buffer) {
        this.data = new Float32Array(buffer);
        const imgData = this.ctx.createImageData(this.width, this.height);

        for (let i = 0; i < this.data.length; i++) {
            const val = this.data[i];
            const [r, g, b] = this.getColor(val);
            const idx = i * 4;
            imgData.data[idx] = r;
            imgData.data[idx + 1] = g;
            imgData.data[idx + 2] = b;
            imgData.data[idx + 3] = 160; // Semi-transparent alpha
        }
        // Draw the data to our hidden "texture" canvas
        this.ctx.putImageData(imgData, 0, 0);
    }
}