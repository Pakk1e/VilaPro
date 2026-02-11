import React, { useEffect, useRef } from 'react';
import Viewport from '../Viewport';
import TileManager from '../TileManager';
import MarkerManager from '../MarkerManager';
import WeatherLayer from '../WeatherLayer';
import HillshadeManager from '../HillshadeManager';

import TemperatureRenderer from '../rendering/TemperatureRendering'


const MapEngine = () => {
    const canvasRef = useRef(null);
    const viewport = useRef(new Viewport());
    const tileManager = useRef(new TileManager()); // New!
    const requestRef = useRef();
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const markerManager = useRef(new MarkerManager());
    const hoveredMarkerId = useRef(null);
    const weatherLayer = useRef(new WeatherLayer());
    //const hillshadeManager = useRef(new HillshadeManager());


    const glRef = useRef(null);
    const temperatureRendererRef = useRef(null);


    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // IMPORTANT: Set canvas size FIRST before creating GL context
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        viewport.current.updateSize(canvas.width, canvas.height);

        // NOW create the GL canvas with correct dimensions
        const hiddenCanvas = document.createElement('canvas');
        hiddenCanvas.width = canvas.width;
        hiddenCanvas.height = canvas.height;

        const gl = hiddenCanvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true
        });
        if (!gl) return;
        glRef.current = gl;

        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');

        const renderer = new TemperatureRenderer(gl);
        temperatureRendererRef.current = renderer;

        let uploading = false;
        window.updateWeatherBinary = (buffer) => {
            if (uploading) return;
            uploading = true;
            const floatData = new Float32Array(buffer);
            renderer.updateData(floatData);
            uploading = false;
        };

        // Event handlers
        const handleDown = (e) => {
            if (e.target !== canvas) return;
            isDragging.current = true;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        };

        const handleMove = (e) => {
            if (isDragging.current) {
                const dx = e.movementX;
                const dy = e.movementY;
                const { dwx, dwy } = viewport.current.pixelsToWorldDelta(dx, dy);
                viewport.current.x -= dwx;
                viewport.current.y -= dwy;

                viewport.current.y = Math.max(0, Math.min(1, viewport.current.y));
            }

            const rect = canvasRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            let foundId = null;
            markerManager.current.markers.forEach(marker => {
                const worldPos = markerManager.current.project(marker.lat, marker.lon);
                const screenPos = viewport.current.worldToPixels(worldPos.x, worldPos.y);
                const dist = Math.sqrt(
                    Math.pow(mouseX - screenPos.x, 2) + Math.pow(mouseY - screenPos.y, 2)
                );
                if (dist < 15) {
                    foundId = marker.id;
                }
            });

            hoveredMarkerId.current = foundId;
            canvasRef.current.style.cursor = foundId ? 'pointer' : 'grab';
        };

        const handleUp = () => {
            isDragging.current = false;
        };

        const handleWheel = (e) => {
            if (e.target !== canvas) return;
            e.preventDefault();
            viewport.current.zoom -= e.deltaY * 0.001;
            viewport.current.zoom = Math.max(1, Math.min(20, viewport.current.zoom));
        };

        const resize = () => {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            viewport.current.updateSize(canvas.width, canvas.height);
            if (glRef.current) {
                glRef.current.canvas.width = canvas.width;
                glRef.current.canvas.height = canvas.height;
            }
        };

        window.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('resize', resize);

        requestRef.current = requestAnimationFrame(render);

        return () => {
            window.updateWeatherBinary = null;
            window.removeEventListener('mousedown', handleDown);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(requestRef.current);
        };
    }, []); // Single useEffect


    // 1. Define the render loop
    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Clear Screen
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const z = Math.floor(viewport.current.zoom);
        const numTiles = Math.pow(2, z);
        const tileSize = 256;

        const currentTileSize = Math.pow(2, viewport.current.zoom - z) * tileSize;
        const centerTileX = Math.floor(viewport.current.x * numTiles);
        const centerTileY = Math.floor(viewport.current.y * numTiles);



        // Draw a slightly larger grid (3x3 or 4x4) to prevent edges from flickering
        const tilesToLeft = Math.ceil(canvas.width / 2 / currentTileSize) + 1;
        const tilesToRight = Math.ceil(canvas.width / 2 / currentTileSize) + 1;



        for (let tx = centerTileX - tilesToLeft; tx <= centerTileX + tilesToRight; tx++) {
            for (let ty = centerTileY - 2; ty <= centerTileY + 2; ty++) {

                // This is the magic: calculate the "Real" tile index even if we are wrapped
                // Example: if numTiles is 4, tx=5 becomes wrappedX=1
                let wrappedX = ((tx % numTiles) + numTiles) % numTiles;

                const worldX = tx / numTiles; // Use tx (unwrapped) for positioning
                const worldY = ty / numTiles;

                const screenPos = viewport.current.worldToPixels(worldX, worldY);

                // Fetch using wrappedX, but draw at screenPos (which uses tx)
                let img = tileManager.current.getTile(z, wrappedX, ty);

                if (img.complete && img.naturalWidth !== 0) {
                    ctx.drawImage(img, screenPos.x, screenPos.y, currentTileSize, currentTileSize);
                    // HILLSHADE
                    /*
                    const hill = hillshadeManager.current.getTile(z, wrappedX, ty);

                    if (hill.complete && hill.naturalWidth !== 0) {
                        ctx.save();
                        ctx.globalAlpha = 0.35; // strength
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.drawImage(hill, screenPos.x, screenPos.y, currentTileSize, currentTileSize);
                        ctx.restore();
                    }
                        */

                } else {
                    // Better Anti-Flicker: Look up multiple zoom levels until we find a cached tile
                    let foundPlaceholder = false;
                    for (let offset = 1; offset <= 3; offset++) {
                        const pZ = z - offset;
                        if (pZ < 0) break;

                        const pNumTiles = Math.pow(2, pZ);
                        const pTX = Math.floor(wrappedX / Math.pow(2, offset));
                        const pTY = Math.floor(ty / Math.pow(2, offset));
                        const pImg = tileManager.current.getTile(pZ, pTX, pTY);

                        if (pImg.complete && pImg.naturalWidth !== 0) {
                            // Calculate which specific part of that low-res parent tile to crop
                            const subTiles = Math.pow(2, offset);
                            const ratio = 256 / subTiles;
                            const offsetX = (wrappedX % subTiles) * ratio;
                            const offsetY = (ty % subTiles) * ratio;

                            ctx.drawImage(pImg, offsetX, offsetY, ratio, ratio, screenPos.x, screenPos.y, currentTileSize, currentTileSize);
                            foundPlaceholder = true;
                            break;
                        }
                    }

                    if (!foundPlaceholder) {
                        ctx.fillStyle = '#1a1a1a'; // Dark grey instead of pure black feels less "broken"
                        ctx.fillRect(screenPos.x, screenPos.y, currentTileSize, currentTileSize);
                    }
                }
            }
        }

        if (temperatureRendererRef.current && glRef.current) {
            const gl = glRef.current;
            const v = viewport.current;

            // Get world coordinates for the four corners of the screen
            const topLeft = v.pixelsToWorld(0, 0);
            const bottomRight = v.pixelsToWorld(canvas.width, canvas.height);



            // Clear and Render
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Pass the world bounds - topLeft has SMALLER y, bottomRight has LARGER y
            let minX = topLeft.x;
            let maxX = bottomRight.x;

            minX = ((minX % 1) + 1) % 1;
            maxX = ((maxX % 1) + 1) % 1;

            // if window crosses 0-meridian → push max forward
            if (maxX < minX) {
                maxX += 1;
            }

            temperatureRendererRef.current.render(
                { x: topLeft.x, y: topLeft.y },
                { x: bottomRight.x, y: bottomRight.y }
            );

            // Draw onto main canvas
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.globalCompositeOperation = 'multiply';

            ctx.drawImage(gl.canvas, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        markerManager.current.markers.forEach(marker => {
            const worldPos = markerManager.current.project(marker.lat, marker.lon);
            const screenPos = viewport.current.worldToPixels(worldPos.x, worldPos.y);
            const isHovered = hoveredMarkerId.current === marker.id;

            // Change style if hovered
            ctx.fillStyle = isHovered ? '#FFFFFF' : '#F43F5E';
            ctx.shadowBlur = isHovered ? 15 : 0;
            ctx.shadowColor = '#F43F5E';

            ctx.beginPath();
            // Grow size on hover
            ctx.arc(screenPos.x, screenPos.y, isHovered ? 12 : 8, 0, Math.PI * 2);
            ctx.fill();

            // Reset shadow so it doesn't bleed into other drawings
            ctx.shadowBlur = 0;

            // Draw label
            ctx.fillStyle = 'white';
            ctx.font = isHovered ? 'bold 14px Inter' : '12px Inter';
            ctx.fillText(marker.label, screenPos.x + 15, screenPos.y + 5);
        });

        requestRef.current = requestAnimationFrame(render);
    };



    return (
        <canvas
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                display: 'block',
                cursor: 'grab',
                background: 'black',
                pointerEvents: 'auto', // Force it to catch clicks
                position: 'relative',
                zIndex: 10,
                imageRendering: 'crisp-edges', // or 'pixelated'
                transition: 'opacity 0.2s ease-in-out'
            }}
        />
    );
};

export default MapEngine;