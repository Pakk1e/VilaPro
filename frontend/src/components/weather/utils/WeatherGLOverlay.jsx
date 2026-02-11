import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const WeatherGLOverlay = ({ data }) => {
    const map = useMap();
    const canvasRef = useRef(null);
    const glRef = useRef(null);
    const programRef = useRef(null);
    const dataTextureRef = useRef(null);
    const lutTextureRef = useRef(null);
    const [shaderSource, setShaderSource] = useState(null);

    // 1. Fetch Shader
    useEffect(() => {
        fetch('/shaders/weather.frag')
            .then(res => res.text())
            .then(setShaderSource);
    }, []);

    // 2. Optimized Render Function
    const render = useCallback(() => {
        const gl = glRef.current;
        const canvas = canvasRef.current;
        if (!gl || !programRef.current || !map || !lutTextureRef.current) return;

        const size = map.getSize();

        // Match canvas size to screen pixels
        if (canvas.width !== size.x || canvas.height !== size.y) {
            canvas.width = size.x;
            canvas.height = size.y;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        // Reset canvas position to top-left of the view
        const topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(canvas, topLeft);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(programRef.current);

        // Textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dataTextureRef.current);
        gl.uniform1i(gl.getUniformLocation(programRef.current, "u_tex"), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lutTextureRef.current);
        gl.uniform1i(gl.getUniformLocation(programRef.current, "u_lut"), 1);

        // Bounds update
        const b = map.getBounds();
        gl.uniform4f(
            gl.getUniformLocation(programRef.current, "u_mapBounds"),
            b.getSouth(), b.getNorth(), b.getWest(), b.getEast()
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }, [map]);

    // 3. WebGL Initialization & Leaflet Lifecycle
    useEffect(() => {
        if (!data || !shaderSource || !canvasRef.current || !map) return;

        const canvas = canvasRef.current;
        const pane = map.getPane('overlayPane');
        pane.appendChild(canvas);

        const gl = canvas.getContext("webgl", { alpha: true, antialias: true });
        glRef.current = gl;

        // Boilerplate Shader Setup
        const vsSource = `attribute vec2 a_pos; varying vec2 v_uv; void main() { v_uv = (a_pos + 1.0) * 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;
        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        };

        const program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSource));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, shaderSource));
        gl.linkProgram(program);
        programRef.current = program;

        // Setup Geometry
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(program, "a_pos");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Process Data Texture
        const { width, height, min, max } = data.metadata;
        const range = (max - min) || 1.0;
        const texData = new Uint8Array(data.data.length);
        for (let i = 0; i < data.data.length; i++) {
            texData[i] = Math.max(0, Math.min(255, ((data.data[i] - min) / range) * 255));
        }
        const dataTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, dataTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, texData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        dataTextureRef.current = dataTex;

        // Load LUT
        const lutImg = new Image();
        lutImg.onload = () => {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lutImg);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            lutTextureRef.current = tex;
            render();
        };
        lutImg.src = '/temperature_lut.png';

        let animId = null;
        const startRenderLoop = () => {
            if (animId) return; const loop = () => {
                render();
                animId = requestAnimationFrame(loop);
            };
            animId = requestAnimationFrame(loop);
        };

        const stopRenderLoop = () => {
            if (animId) {
                cancelAnimationFrame(animId); animId = null;
            }
        };

        map.on("movestart zoomstart", startRenderLoop);
        map.on("moveend zoomend", stopRenderLoop);
        map.on("moveend zoomend resize", render);
        render();
        return () => {
            stopRenderLoop();
            map.off("movestart zoomstart", startRenderLoop);
            map.off("moveend zoomend resize", render);
        };

    }, [map, data, shaderSource, render]);

    return (
        <canvas
            ref={canvasRef}
            className="leaflet-zoom-animated"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 400,
                pointerEvents: "none",
                opacity: 0.8,
                display: 'block'
            }}
        />
    );
};

export default WeatherGLOverlay;