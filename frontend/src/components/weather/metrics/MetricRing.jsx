// MetricRing.jsx refactor
export default function MetricRing({ value, max = 100, size = 64, stroke = 8, color = "#2DD4BF" }) {
    const radius = (size - stroke - 4) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / max, 1);
    const offset = circumference * (1 - progress);

    return (
        <div className="flex items-center justify-center relative">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                <defs>
                    <filter id="mint-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="blur" in2="SourceGraphic" operator="over" />
                    </filter>
                </defs>
                {/* Background Track */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke="#334155" strokeWidth={stroke} fill="none"
                />
                {/* Progress Track */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke={color} strokeWidth={stroke} fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className="transition-all duration-1000 ease-out"
                    filter="url(#mint-glow)"
                />
            </svg>
        </div>
    );
}