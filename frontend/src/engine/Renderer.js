// Renderer.js
export default class WeatherRenderer {
    constructor(gl) {
        this.gl = gl;
        const ext = gl.getExtension('OES_texture_float');
        if (!ext) {
            alert('Float textures not supported on this browser');
        }

        // 1. Initialize shaders and program
        this.program = this.initProgram(this.vsSource, this.fsSource);

        // 2. Create geometry (a simple square that covers the world)
        this.initBuffers();

        // 3. Create the data texture
        this.texture = this.createDataTexture();

        this.lutTexture = this.createTemperatureLUT();

        // Attribute/Uniform locations
        this.locations = {
            position: gl.getAttribLocation(this.program, 'a_position'),
            texCoord: gl.getAttribLocation(this.program, 'a_texCoord'),
            uMatrix: gl.getUniformLocation(this.program, 'u_matrix'),
            uTexture: gl.getUniformLocation(this.program, 'u_dataTexture'),
            uLut: gl.getUniformLocation(this.program, 'u_lut'),
            uResolution: gl.getUniformLocation(this.program, "u_resolution"),

            // NEW
            uWorldMin: gl.getUniformLocation(this.program, 'u_worldMin'),
            uWorldMax: gl.getUniformLocation(this.program, 'u_worldMax'),

        };

    }

    // Renderer.js

    get vsSource() {
        return `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);
    // Standardize UV so 0,0 is top-left
    v_uv = vec2(a_position.x, 1.0 - a_position.y);
}
`;
    }

    // Renderer.js -> get fsSource()
    get fsSource() {
        return `
precision highp float;

uniform sampler2D u_dataTexture;
uniform sampler2D u_lut;
uniform vec2 u_worldMin;
uniform vec2 u_worldMax;
varying vec2 v_uv;

const float PI = 3.141592653589793;

// Converts Web Mercator Y (0-1) to actual Latitude degrees
float mercatorYToLat(float y) {
    float latRad = 2.0 * atan(exp(PI * (1.0 - 2.0 * y))) - PI / 2.0;
    return degrees(latRad);
}

void main() {
    // 1. Interpolate current screen pixel to world coordinates
    float worldX = mix(u_worldMin.x, u_worldMax.x, v_uv.x);
    float worldY = mix(u_worldMin.y, u_worldMax.y, v_uv.y);

    // 2. Wrap longitude for the seamless infinite scroll
    float tx = fract(worldX + 0.5);

    // 3. THE FIX: Convert the "stretched" Mercator Y to "flat" Latitude
    float lat = mercatorYToLat(worldY);

    // 4. Map that latitude to your texture Y (Top=90, Bottom=-90)
    // If your texture has 90N at the top index, this math is correct:
    float ty = (90.0 - lat) / 180.0;
    
    // 5. Sample and clamp
    ty = clamp(ty, 0.0, 1.0);
    float dataVal = texture2D(u_dataTexture, vec2(tx, ty)).r;
    float intensity = smoothstep(0.05, 0.25, dataVal);
    vec4 color = texture2D(u_lut, vec2(dataVal, 0.5));
    vec3 c = color.rgb;
    c = (c - 0.5) * 1.15 + 0.5;
    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(luma), c, 1.25);
    c = pow(c, vec3(0.95));
    gl_FragColor = vec4(c, 0.85);
}
`;
    }

    initBuffers() {
        const gl = this.gl;
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        // Use standard -1 to 1 clip space coordinates
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0, // Bottom-left
            1, 0, // Bottom-right
            0, 1, // Top-left
            1, 1  // Top-right
        ]), gl.STATIC_DRAW);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0,
        ]), gl.STATIC_DRAW);
    }

    createDataTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // Changed from CLAMP_TO_EDGE
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // Changed from CLAMP_TO_EDGE

        // 🔥 allocate empty storage immediately
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 0, 255])
        );

        return tex;
    }


    updateData(floatArray) {
        const gl = this.gl;
        const width = 1440;
        const height = 721;

        console.log("North Pole (0,0):", floatArray[0]);
        console.log("Equator center (~360):", floatArray[Math.floor(height / 2) * width]);
        console.log("South Pole (last):", floatArray[floatArray.length - 1]);

        const bytes = new Uint8Array(width * height * 4);

        for (let i = 0; i < floatArray.length; i++) {
            let t = floatArray[i];
            if (t > 200) t -= 273.15;

            // Use original -30 to +50 range
            let norm = (t + 30) / 80;
            norm = Math.max(0, Math.min(1, norm));
            let byteVal = Math.floor(norm * 255);

            // DON'T FLIP - store directly
            const idx = i * 4;
            bytes[idx] = byteVal;
            bytes[idx + 1] = byteVal;
            bytes[idx + 2] = byteVal;
            bytes[idx + 3] = 255;
        }

        console.log("Sample values:", bytes[0], bytes[Math.floor(height / 2) * width * 4], bytes[bytes.length - 4]);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);

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
    }


    render(matrix, worldMin, worldMax, resolution) {

        const gl = this.gl;
        gl.useProgram(this.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.locations.uTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
        gl.uniform1i(this.locations.uLut, 1); // Unit 1

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.locations.position);
        gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

        if (this.locations.texCoord !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
            gl.enableVertexAttribArray(this.locations.texCoord);
            gl.vertexAttribPointer(this.locations.texCoord, 2, gl.FLOAT, false, 0, 0);
        }

        gl.uniformMatrix3fv(this.locations.uMatrix, false, matrix);

        gl.uniform2f(this.locations.uWorldMin, worldMin.x, worldMin.y);
        gl.uniform2f(this.locations.uWorldMax, worldMax.x, worldMax.y);
        gl.uniform2f(this.locations.uResolution, resolution.x, resolution.y);



        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    }

    initProgram(vs, fs) {
        const gl = this.gl;

        const vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader, vs);
        gl.compileShader(vShader);
        if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            console.error("Vertex Shader Error:", gl.getShaderInfoLog(vShader));
        }

        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader, fs);
        gl.compileShader(fShader);
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            console.error("Fragment Shader Error:", gl.getShaderInfoLog(fShader));
        }

        const program = gl.createProgram();
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program Link Error:", gl.getProgramInfoLog(program));
        }

        return program;
    }

    // Add to WeatherRenderer class
    createTemperatureLUT() {
        const gl = this.gl;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 256, 0);

        // Zoom Earth inspired vibrant scale (-30 to +50)
        grad.addColorStop(0.00, '#472b8f'); // deep cold
        grad.addColorStop(0.15, '#365bd8');
        grad.addColorStop(0.30, '#1fa3ff');
        grad.addColorStop(0.45, '#22d3ee'); // better cyan
        grad.addColorStop(0.58, '#86efac'); // vivid green
        grad.addColorStop(0.70, '#fde047'); // rich yellow
        grad.addColorStop(0.82, '#fb923c'); // orange
        grad.addColorStop(0.92, '#ef4444'); // hot red
        grad.addColorStop(1.00, '#7f1d1d'); // extreme



        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 1);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)       // Infinite X
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);


        return tex;
    }
}