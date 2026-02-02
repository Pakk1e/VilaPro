import React from "react";


import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
} from "recharts";

import WeatherIcon from './icons/WeatherIcon'

/* ------------------ DAY SEGMENTS ------------------ */
const DAY_SEGMENTS = [
    { key: "morning", label: "Morning", start: 6, end: 12 },
    { key: "afternoon", label: "Afternoon", start: 12, end: 18 },
    { key: "evening", label: "Evening", start: 18, end: 24 },
    { key: "night", label: "Night", start: 0, end: 6 },
];

/* ------------------ HELPERS ------------------ */
const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    // Only show the dot for the "NOW" point
    if (payload.label !== "NOW") return null;

    return (
        <g>
            <circle cx={cx} cy={cy} r={10} fill="#3b82f6" fillOpacity={0.15} />
            <circle
                cx={cx}
                cy={cy}
                r={5}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={3}
                className="drop-shadow-lg"
            />
        </g>
    );
};

function getCurrentSegmentIndex(hour) {
    return DAY_SEGMENTS.findIndex(seg =>
        seg.start < seg.end
            ? hour >= seg.start && hour < seg.end
            : hour >= seg.start || hour < seg.end
    );
}

function rotateSegments(segments, startIndex) {
    return [
        ...segments.slice(startIndex),
        ...segments.slice(0, startIndex),
    ];
}

function averageTempForSegment(hourly, segment) {
    if (!hourly) return 0;
    const temps = hourly
        .filter(h => {
            const date = new Date(h.time);
            const hour = date.getHours();
            return segment.start < segment.end
                ? hour >= segment.start && hour < segment.end
                : hour >= segment.start || hour < segment.end;
        })
        .map(h => h.temperature);

    return temps.length
        ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)
        : 0;
}

/* ------------------ COMPONENT ------------------ */

const CustomTick = ({ x, y, payload, chartData }) => {
    if (!payload.value) return null;
    const dataPoint = chartData.find((d) => d.label === payload.value);
    if (!dataPoint) return null;

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={10}
                fontWeight={800}
                className="uppercase tracking-tighter"
            >
                {payload.value}
            </text>
            <text
                x={0}
                y={42}
                textAnchor="middle"
                fill="#1e293b"
                fontSize={15}
                fontWeight={900}
            >
                {dataPoint.temp}°
            </text>
        </g>
    );
};

export default function TemperatureDayPartChart({ hourly, currentTemp, currentMetrics }) {
    const currentHour = new Date().getHours();
    const startIndex = getCurrentSegmentIndex(currentHour);
    const rotatedSegments = rotateSegments(DAY_SEGMENTS, startIndex);

    const actualData = [
        { label: "NOW", temp: Math.round(currentTemp) },
        ...rotatedSegments.slice(0, 3).map((seg) => ({
            label: seg.label,
            temp: averageTempForSegment(hourly, seg) || Math.round(currentTemp),
        })),
    ];

    const chartData = [
        { label: "", temp: actualData[0].temp - 1.5 },
        ...actualData,
        { label: "", temp: actualData[actualData.length - 1].temp - 1 },
    ];

    if (!hourly || hourly.length === 0) return null;

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 40 }}>
                        <defs>
                            <linearGradient id="colorMint" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="label"
                            interval={0}
                            axisLine={false}
                            tickLine={false}
                            tick={<CustomTick chartData={chartData} />}
                        />
                        <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                        <Area
                            type="monotone"
                            dataKey="temp"
                            stroke="#2DD4BF"
                            strokeWidth={5}
                            fill="url(#colorMint)"
                            dot={<CustomDot />} // Ensure CustomDot uses fill="#2DD4BF"
                            isAnimationActive={true}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* METRICS FOOTER: Updated with deep slate text and subtle icons */}

        </div>
    );
}
