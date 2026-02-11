import GLProgram from "./core/GLProgram";
import FullscreenQuad from "./core/FullscreenQuad";
import { createLUT } from "./core/TextureFactory";

import vs from "./shaders/temperature.vs.glsl?raw";
import fs from "./shaders/temperature.fs.glsl?raw";

export default class TemperatureRenderer {
    constructor(gl) {
        this.gl = gl;
        console.log(vs.substring(0, 40));

        this.program = new GLProgram(gl, vs, fs);
        this.quad = new FullscreenQuad(gl);

        this.locations = {
            position: gl.getAttribLocation(this.program.program, "a_position"),
            uData: gl.getUniformLocation(this.program.program, "u_dataTexture"),
            uLut: gl.getUniformLocation(this.program.program, "u_lut"),
            uWorldMin: gl.getUniformLocation(this.program.program, "u_worldMin"),
            uWorldMax: gl.getUniformLocation(this.program.program, "u_worldMax"),
        };

        this.lut = createLUT(gl, [
            [0.00, '#472b8f'],
            [0.15, '#365bd8'],
            [0.30, '#1fa3ff'],
            [0.45, '#22d3ee'],
            [0.58, '#86efac'],
            [0.70, '#fde047'],
            [0.82, '#fb923c'],
            [0.92, '#ef4444'],
            [1.00, '#7f1d1d'],
        ]);
    }

    updateData(floatArray) {
        const gl = this.gl;

        const width = 1440;
        const height = 721;

        const bytes = new Uint8Array(width * height * 4);

        for (let i = 0; i < floatArray.length; i++) {
            let t = floatArray[i];
            if (t > 200) t -= 273.15;

            let norm = (t + 30) / 80;
            norm = Math.max(0, Math.min(1, norm));
            let byteVal = Math.floor(norm * 255);

            const idx = i * 4;
            bytes[idx] = byteVal;
            bytes[idx + 1] = byteVal;
            bytes[idx + 2] = byteVal;
            bytes[idx + 3] = 255;
        }

        // create texture if first time
        if (!this.dataTexture) {
            this.dataTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            bytes
        );
        console.log("✅ temperature uploaded");

    }


    render(worldMin, worldMax) {
        const gl = this.gl;

        if (!this.dataTexture) return;

        this.program.use();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.uniform1i(this.locations.uData, 0);


        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.lut);
        gl.uniform1i(this.locations.uLut, 1);

        gl.uniform2f(this.locations.uWorldMin, worldMin.x, worldMin.y);
        gl.uniform2f(this.locations.uWorldMax, worldMax.x, worldMax.y);

        this.quad.bind(this.locations.position);
        this.quad.draw();
    }
}
