export default function MetricRing({ value, max, size, stroke, color }) {
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;

    // Ensure we don't divide by zero and clamp the percentage between 0-100
    const safeMax = max || 100;
    const percentage = Math.min(Math.max((value / safeMax) * 100, 0), 100);
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <svg width={size} height={size} className="rotate-[-90deg]">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={stroke}
                fill="transparent"
                className="text-white/5"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={stroke}
                fill="transparent"
                strokeDasharray={circumference}
                style={{
                    strokeDashoffset: offset,
                    // ADD THIS: Makes the ring "slide" when you switch EU/US
                    transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease"
                }}
                strokeLinecap="round"
            />
        </svg>
    );
}