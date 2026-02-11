export default class HillshadeManager {
    constructor() {
        this.cache = new Map();
    }

    getTile(z, x, y) {
        const key = `${z}/${x}/${y}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.src = `http://localhost:5001/api/tiles/hillshading/${z}/${x}/${y}`;



        this.cache.set(key, img);
        return img;
    }
}
