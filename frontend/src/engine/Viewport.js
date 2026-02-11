/**
 * The Viewport manages the "Camera"
 * It handles the math for converting World coordinates (0-1) 
 * to Screen Pixels based on zoom level and center position.
 */
export default class Viewport {
    constructor() {
        this.x = 0.5;      // Center X of the world (0 to 1)
        this.y = 0.5;      // Center Y of the world (0 to 1)
        this.zoom = 2;     // Fractional zoom (2.0, 2.1, etc.)
        this.width = 0;    // Canvas width in pixels
        this.height = 0;   // Canvas height in pixels
    }

    // Updates screen dimensions when the window is resized
    updateSize(w, h) {
        this.width = w;
        this.height = h;
    }

    /**
     * The core math: Converts world coordinate to screen pixel
     * wx, wy: 0.0 to 1.0
     */
    worldToPixels(wx, wy) {
        const totalWorldSize = Math.pow(2, this.zoom) * 256;

        const pixelX = wx * totalWorldSize;
        const pixelY = wy * totalWorldSize;

        const centerX = this.x * totalWorldSize;
        const centerY = this.y * totalWorldSize;

        return {
            x: (pixelX - centerX) + this.width / 2,
            y: (pixelY - centerY) + this.height / 2
        };
    }


    pixelsToWorld(px, py) {
        const totalWorldSize = Math.pow(2, this.zoom) * 256;

        const centerX = this.x * totalWorldSize;
        const centerY = this.y * totalWorldSize;

        const worldPixelX = px + centerX - this.width / 2;
        const worldPixelY = py + centerY - this.height / 2;

        return {
            x: worldPixelX / totalWorldSize,
            y: worldPixelY / totalWorldSize
        };
    }

    pixelsToWorldDelta(dx, dy) {
        const totalWorldSize = Math.pow(2, this.zoom) * 256;
        return {
            dwx: dx / totalWorldSize,
            dwy: dy / totalWorldSize
        };
    }

    getVisibleTiles() {
        const z = Math.floor(this.zoom);
        const numTiles = Math.pow(2, z);

        // Calculate the range of tiles currently visible on screen
        // We'll start simple: just find the tile under the center
        const centerX = Math.floor(this.x * numTiles);
        const centerY = Math.floor(this.y * numTiles);

        return { z, centerX, centerY };
    }
}