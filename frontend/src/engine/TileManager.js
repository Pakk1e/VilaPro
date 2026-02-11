export default class TileManager {
    constructor() {
        this.tiles = new Map();
    }

    getTile(z, x, y) {
        const numTiles = Math.pow(2, z);

        // 🌍 Wrap X infinitely
        const wrappedX = ((x % numTiles) + numTiles) % numTiles;

        // 🧱 Clamp Y (cannot go outside world vertically)
        if (y < 0 || y >= numTiles) {
            const dummy = new Image(); // empty image so renderer can skip safely
            return dummy;
        }

        const key = `${z}/${wrappedX}/${y}`;
        if (this.tiles.has(key)) return this.tiles.get(key);

        const img = new Image();
        img.crossOrigin = "anonymous";

        // ✅ Development-friendly server (allows browser usage)
        img.src = `http://localhost:5001/api/tiles/${z}/${wrappedX}/${y}`;

        this.tiles.set(key, img);
        return img;
    }
}
