const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5001;

// Configuration based on our packer settings
const POINTS_PER_VAR = 1038240;
const SCRIPTS_PATH = path.join(__dirname, '../weather_engine/scripts');

app.use(cors());

/**
 * Helper to determine which variable index to look up
 * 0: Temperature (K)
 * 1: Precipitation (kg/m^2)
 * 2: Wind U (m/s)
 * 3: Wind V (m/s)
 * 4: Cloud Cover (%)
 */
function getVariableOffset(type) {
    const mapping = { 'temp': 0, 'rain': 1, 'windu': 2, 'windv': 3, 'clouds': 4 };
    return (mapping[type] || 0) * POINTS_PER_VAR;
}

app.get('/api/weather/world', (req, res) => {
    const { hour = "000", type = "temp" } = req.query;
    const filePath = path.join(SCRIPTS_PATH, `gfs_f${hour.padStart(3, '0')}.bin`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
    }

    try {
        const buffer = fs.readFileSync(filePath);
        const weatherData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
        const varOffset = getVariableOffset(type.toLowerCase());

        const WIDTH = 1440;
        const HEIGHT = 721;

        const values = new Float32Array(WIDTH * HEIGHT);

        let min = Infinity;
        let max = -Infinity;

        for (let r = 0; r < HEIGHT; r++) {
            for (let c = 0; c < WIDTH; c++) {
                let v = weatherData[varOffset + r * WIDTH + c];
                if (type === 'temp') v -= 273.15;

                min = Math.min(min, v);
                max = Math.max(max, v);

                const flippedRow = HEIGHT - 1 - r;
                values[flippedRow * WIDTH + c] = v;
            }
        }


        res.json({
            metadata: {
                model: "GFS 0.25°",
                width: WIDTH,
                height: HEIGHT,
                min,
                max
            },
            data: Array.from(values)
        });

    } catch (e) {
        console.error(e);
        res.status(500).send("World processing error");
    }
});



app.get('/api/weather/raw', (req, res) => {
    const { hour = "000", type = "temp" } = req.query;
    const filePath = path.join(SCRIPTS_PATH, `gfs_f${hour.padStart(3, '0')}.bin`);

    if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

    try {
        const buffer = fs.readFileSync(filePath);
        const varOffset = getVariableOffset(type.toLowerCase());

        // Each variable is POINTS_PER_VAR * 4 bytes
        const start = varOffset * 4;
        const end = start + (POINTS_PER_VAR * 4);
        const slice = buffer.subarray(start, end);

        res.set('Content-Type', 'application/octet-stream');
        res.send(slice);
    } catch (e) {
        res.status(500).send("Error slicing binary");
    }
});



app.get("/api/tiles/:z/:x/:y", async (req, res) => {
    const { z, x, y } = req.params;

    const url = `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log("❌ provider error", response.status);
            return res.status(500).send("provider failed");
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set("Content-Type", "image/png");
        res.set("Access-Control-Allow-Origin", "*");
        res.send(buffer);

    } catch (e) {
        console.log("❌ proxy crash", e);
        res.status(500).send("tile error");
    }
});


app.get("/api/tiles/hillshading/:z/:x/:y", async (req, res) => {
    const { z, x, y } = req.params;

    const url = `https://tiles.stadiamaps.com/tiles/stamen_terrain_background/${z}/${x}/${y}.png`;


    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log("❌ provider error", response.status);
            return res.status(500).send("provider failed");
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set("Content-Type", "image/png");
        res.set("Access-Control-Allow-Origin", "*");
        res.send(buffer);

    } catch (e) {
        console.log("❌ proxy crash", e);
        res.status(500).send("tile error");
    }
});


app.listen(PORT, () => console.log(`🚀 Weather Binary Engine live on port ${PORT}`));