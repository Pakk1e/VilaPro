import React, { useEffect, useMemo, useState } from "react";
import ZoomableSvg from "./ZoomableSvg";

export default function ParkingMapSvg({
    highlightedSpot,
    zoomScale,
    setZoomScale,
    zoomOffset,
    setZoomOffset,
}) {
    const [parkMap, setParkMap] = useState(null);

    useEffect(() => {
        fetch("/park_map.geojson")
            .then(res => res.json())
            .then(setParkMap)
            .catch(err => {
                console.error("Failed to load park_map.geojson", err);
            });
    }, []);

    function getRingsFromGeometry(geometry) {
        if (!geometry) return [];

        const { type, coordinates } = geometry;

        if (type === "Polygon" && Array.isArray(coordinates)) {
            return coordinates;
        }

        if (type === "MultiPolygon" && Array.isArray(coordinates)) {
            return coordinates.flat();
        }

        return [];
    }

    const bounds = useMemo(() => {
        if (!parkMap) return null;

        let minLon = Infinity;
        let minLat = Infinity;
        let maxLon = -Infinity;
        let maxLat = -Infinity;

        parkMap.features.forEach(feature => {
            const rings = getRingsFromGeometry(feature.geometry);

            rings.forEach(ring => {
                ring.forEach(([lon, lat]) => {
                    minLon = Math.min(minLon, lon);
                    minLat = Math.min(minLat, lat);
                    maxLon = Math.max(maxLon, lon);
                    maxLat = Math.max(maxLat, lat);
                });
            });
        });

        return { minLon, minLat, maxLon, maxLat };
    }, [parkMap]);

    if (!parkMap || !bounds) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                Loading map…
            </div>
        );
    }

    const WIDTH = 800;
    const HEIGHT = 600;

    function project([lon, lat]) {
        const x =
            ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * WIDTH;

        const y =
            ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * HEIGHT;

        return [x, y];
    }

    function polygonToPath(coords) {
        return (
            coords
                .map((point, i) => {
                    const [x, y] = project(point);
                    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ") + " Z"
        );
    }

    



    return (
        <ZoomableSvg
            width={WIDTH}
            height={HEIGHT}
            scale={zoomScale}
            setScale={setZoomScale}
            offset={zoomOffset}
            setOffset={setZoomOffset}
        >

            {parkMap.features.map(feature => {
                const rings = getRingsFromGeometry(feature.geometry);
                if (rings.length === 0) return null;

                const spotName = feature.properties?.name;
                const isHighlighted = spotName === highlightedSpot;

                const pathD = rings
                    .map(ring => polygonToPath(ring))
                    .join(" ");

                // Compute centroid for label (simple average — good enough here)
                let cx = 0;
                let cy = 0;
                let count = 0;

                rings.forEach(ring => {
                    ring.forEach(point => {
                        const [x, y] = project(point);
                        cx += x;
                        cy += y;
                        count += 1;
                    });
                });

                cx /= count;
                cy /= count;

                return (
                    <g key={feature.properties.spaceId || spotName}>
                        {/* PARKING SHAPE */}
                        <path
                            d={pathD}
                            fill={isHighlighted ? "#2563eb" : "#e5e7eb"}
                            stroke={isHighlighted ? "#1d4ed8" : "#cbd5e1"}
                            strokeWidth={isHighlighted ? 2.5 : 1}
                            opacity={isHighlighted ? 1 : 0.18}
                            filter={isHighlighted ? "url(#glow)" : "none"}
                        />

                        {/* SPOT NUMBER */}
                        {spotName && (
                            <text
                                x={cx}
                                y={cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="10"
                                fill={isHighlighted ? "#ffffff" : "#64748b"}
                                opacity={isHighlighted ? 1 : 0.6}
                                style={{ pointerEvents: "none" }}
                            >
                                {spotName}
                            </text>
                        )}
                    </g>
                );
            })}

            {/* GLOW FILTER */}
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </ZoomableSvg>
    );

}
