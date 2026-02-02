import React from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
} from "recharts";

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
    if (payload.label !== "NOW") return null;

    return (
        <g>
            <circle cx={cx} cy={cy} r={10} fill="#2DD4BF" fillOpacity={0.15} />
            <circle
                cx={cx}
                cy={cy}
                r={5}
                fill="#2DD4BF"
                stroke="#fff"
                strokeWidth={3}
                className="drop-shadow-lg"
            />
        </g>
    );
};

function averageValueForSegment(hourly, segment, key, timezone) {
    if (!hourly || hourly.length === 0) return 0;

    const values = hourly
        .filter(h => {
            const date = new Date(h.time);
            // Get hour relative to city timezone
            const hourInCity = parseInt(
                new Intl.DateTimeFormat('en-GB', {
                    hour: 'numeric',
                    hour12: false,
                    timeZone: timezone
                }).format(date)
            );

            const isInSegment = segment.start < segment.end
                ? hourInCity >= segment.start && hourInCity < segment.end
                : hourInCity >= segment.start || hourInCity < segment.end;

            // Limit to next 24 hours
            const isWithin24h = (date - new Date()) < 24 * 60 * 60 * 1000;
            return isInSegment && isWithin24h;
        })
        .map(h => h[key]);

    return values.length
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
}

const CustomTick = ({ x, y, payload, chartData, unit }) => {
    if (!payload.value) return null;
    const dataPoint = chartData.find((d) => d.label === payload.value);
    if (!dataPoint) return null;

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={20} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight={800} className="uppercase tracking-tighter">
                {payload.value}
            </text>
            <text x={0} y={42} textAnchor="middle" fill="#1e293b" fontSize={15} fontWeight={900}>
                {dataPoint.displayVal}{unit}
            </text>
        </g>
    );
};

/* ------------------ COMPONENT ------------------ */

export default function UniversalWeatherChart({ hourly, activeMetricId, currentVal, timezone }) {
    if (!hourly || hourly.length === 0) return null;

    const currentHourInCity = parseInt(
        new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            hour12: false,
            timeZone: timezone || 'UTC'
        }).format(new Date())
    );

    const startIndex = DAY_SEGMENTS.findIndex(seg =>
        seg.start < seg.end
            ? currentHourInCity >= seg.start && currentHourInCity < seg.end
            : currentHourInCity >= seg.start || currentHourInCity < seg.end
    );

    // Create the logical flow of time segments
    const rotatedSegments = [
        ...DAY_SEGMENTS.slice(startIndex),
        ...DAY_SEGMENTS.slice(0, startIndex),
    ];

    const metricKeyMap = {
        temperature: { key: 'temperature', unit: '°' },
        pressure: { key: 'pressure', unit: ' hPa' },
        humidity: { key: 'humidity', unit: '%' },
        wind: { key: 'windSpeed', unit: ' km/h' }
    };

    const config = metricKeyMap[activeMetricId] || metricKeyMap.temperature;

    // Fixed: All points now use 'displayVal'
    const actualData = [
        { label: "NOW", displayVal: Math.round(currentVal) || 0 },
        ...rotatedSegments.slice(1, 4).map((seg) => ({
            label: seg.label,
            displayVal: averageValueForSegment(hourly, seg, config.key, timezone),
        })),
    ];

    // Padding points for the curve
    const chartData = [
        { label: "", displayVal: actualData[0].displayVal },
        ...actualData,
        { label: "", displayVal: actualData[actualData.length - 1].displayVal },
    ];

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
                            tick={<CustomTick chartData={chartData} unit={config.unit} />}
                        />
                        {/* Domain adjusted to handle large numbers like Pressure */}
                        <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                        <Area
                            type="monotone"
                            dataKey="displayVal"
                            stroke="#2DD4BF"
                            strokeWidth={5}
                            fill="url(#colorMint)"
                            dot={<CustomDot />}
                            isAnimationActive={true}
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}