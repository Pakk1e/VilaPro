import React from 'react';

export default function WeatherIcon({ type, isNight = false, size = 48, className = "" }) {
    const cleanType = type ? type.toLowerCase().trim() : 'clear';
    let finalType = cleanType;

    // Global Night Logic: Mapping standard types to their night variants
    if (isNight) {
        const nightMap = {
            'clear': 'clear-night',
            'partly-cloudy': 'partly-cloudy-night',
            'overcast': 'cloudy-night',
            'cloudy': 'cloudy-night',
            'fog': 'fog-night',
            'drizzle-light': 'rain-night',
            'drizzle-med': 'rain-night',
            'drizzle-heavy': 'rain-night',
            'rain-light': 'rain-night',
            'rain-med': 'rain-night',
            'rain-heavy': 'rain-night',
            'showers-light': 'rain-night',
            'showers-med': 'rain-night',
            'showers-heavy': 'rain-night',
            'snow-light': 'snow-night',
            'snow-med': 'snow-night',
            'snow-heavy': 'snow-night',
            'snow-showers': 'snow-night',
            'storm': 'storm-night',
            'storm-hail': 'storm-night'
        };
        finalType = nightMap[cleanType] || cleanType;
    }
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`overflow-visible ${className}`}
        >
            <defs>
                <filter id="glass-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
                    <feOffset dx="1" dy="1.5" result="offsetBlur" />
                    <feFlood floodColor="#64748b" floodOpacity="0.4" result="offsetColor" />
                    <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="shadow" />
                    <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <linearGradient id="sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>

                <linearGradient id="cloud-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>

                <linearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>

                <linearGradient id="cloud-night-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                <linearGradient id="storm-bolt" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
            </defs>

            {renderIconPath(finalType, isNight)}
        </svg>
    );
}

function renderIconPath(type, isNight = false) {
    const filter = "url(#glass-shadow)";
    const cloudPath = "M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.4-1.9-4.4-4.3-4.5C16.9 6.9 14 4.5 10.5 4.5 7.4 4.5 4.8 6.5 4 9.3 2.3 10.1 1 11.9 1 14c0 2.8 2.2 5 5 5h11.5z";
    const rainCloudPath = "M17.5 15c2.5 0 4.5-2 4.5-4.5 0-2.4-1.9-4.4-4.3-4.5C16.9 2.9 14 0.5 10.5 0.5 7.4 0.5 4.8 2.5 4 5.3 2.3 6.1 1 7.9 1 10c0 2.8 2.2 5 5 5h11.5z";
    const moonPath = "M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z";

    switch (type) {
        case 'temp':
        case 'temperature':
            return (
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {/* Thermometer Tube */}
                    <path d="M14 4.5V14a3.5 3.5 0 1 1-4 0V4.5a2 2 0 1 1 4 0z" />
                    {/* Level line */}
                    <path d="M10 14h4" />
                    {/* Mercury Fill */}
                    <path d="M12 17v-4" strokeWidth="2" stroke="currentColor" />
                    <circle cx="12" cy="17" r="1.5" fill="currentColor" />
                </g>
            );

        case 'pressure':
            return (
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 1.905.666 3.655 1.778 5.03L4 19h5l1.5-2h3l1.5 2h5l-1.778-3.97A7.96 7.96 0 0 0 20 10z" />
                    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
                    <path d="M12 10l2-3" />
                </g>
            );
        case 'humidity':
            return (
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M6 15h12" />
                    <path d="M7 18h10" />
                    <path d="M12 4v4" />
                    <path d="M9 6l6 0" />
                </g>
            );
        case 'wind-metric':
            return (
                <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4c2 0 3 1 3 3s-1 3-3 3H2" />
                    <path d="M10 14c1.5 0 2.5 1 2.5 2.5S11.5 19 10 19H2" />
                    <path d="M15 11c1.5 0 2.5 1 2.5 2.5S16.5 16 15 16H2" />
                    <circle cx="19" cy="8" r="0.5" fill="currentColor" />
                    <circle cx="21" cy="13" r="0.5" fill="currentColor" />
                </g>
            );
        case 'clear':
            return <circle cx="12" cy="12" r="8" fill="url(#sun-grad)" filter={filter} />;
        case 'clear-night':
            return <path d={moonPath} fill="url(#moon-grad)" filter={filter} />;

        // --- PARTLY CLOUDY ---
        case 'partly-cloudy':
            return (
                <g filter={filter}>
                    <circle cx="15" cy="9" r="5" fill="url(#sun-grad)" />
                    <path d={cloudPath} fill="url(#cloud-grad)" />
                </g>
            );
        case 'partly-cloudy-night':
            return (
                <g filter={filter}>
                    <path d="M11 6a5 5 0 1 0 5 5c0-.25-.02-.51-.06-.75a3 3 0 1 1-2.44 1.25 3 3 0 0 1-1.75-5.44c-.25-.04-.51-.06-.75-.06z" fill="url(#moon-grad)" />
                    <path d={cloudPath} fill="url(#cloud-night-grad)" />
                </g>
            );

        // --- OVERCAST & FOG ---
        case 'cloudy-night':
            return (
                <g filter={filter}>
                    {/* The Moon peaking out from behind */}
                    <g transform="translate(10, 2) scale(0.7)">
                        <path d={moonPath} fill="url(#moon-grad)" />
                    </g>
                    {/* The Main Cloud */}
                    <path d={cloudPath} fill="url(#cloud-night-grad)" />
                </g>
            );
        case 'overcast':
            return <path d={cloudPath} fill="url(#cloud-grad)" filter={filter} />;
        case 'overcast-night':
            return <path d={cloudPath} fill="url(#cloud-night-grad)" filter={filter} />;
        case 'fog':
            return (
                <g filter={filter} stroke="url(#cloud-grad)" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 10h16M4 14h16M7 18h10" />
                </g>
            );
        case 'fog-night':
            return (
                <g filter={filter} stroke="url(#cloud-night-grad)" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 10h16M4 14h16M7 18h10" />
                </g>
            );

        // --- RAIN & DRIZZLE ---
        case 'rain-light':
        case 'drizzle-light':
        case 'drizzle-med':
        case 'drizzle-heavy':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <path d="M10 17v2M14 17v2" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                </g>
            );
        case 'rain-med':
        case 'rain-heavy':
        case 'showers-light':
        case 'showers-med':
        case 'showers-heavy':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <path d="M8 17l-1 3M12 18l-1 3M16 17l-1 3" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                </g>
            );
        case 'rain-night':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-night-grad)" />
                    <path d="M8 17l-1 3M12 18l-1 3M16 17l-1 3" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                </g>
            );

        // --- SNOW ---
        case 'snow-light':
        case 'snow-med':
        case 'snow-showers':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <circle cx="8" cy="18" r="1" fill="#cbd5e1" />
                    <circle cx="12" cy="20" r="1" fill="#cbd5e1" />
                    <circle cx="16" cy="18" r="1" fill="#cbd5e1" />
                </g>
            );
        case 'snow-heavy':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <circle cx="8" cy="17" r="1" fill="#cbd5e1" /><circle cx="12" cy="17" r="1" fill="#cbd5e1" /><circle cx="16" cy="17" r="1" fill="#cbd5e1" />
                    <circle cx="10" cy="20" r="1" fill="#cbd5e1" /><circle cx="14" cy="20" r="1" fill="#cbd5e1" />
                </g>
            );
        case 'snow-night':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-night-grad)" />
                    <circle cx="8" cy="18" r="1" fill="#e2e8f0" />
                    <circle cx="12" cy="20" r="1" fill="#e2e8f0" />
                    <circle cx="16" cy="18" r="1" fill="#e2e8f0" />
                </g>
            );

        // --- STORM ---
        case 'storm':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <path d="M13 14l-2 4h3l-2 4" stroke="url(#storm-bolt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            );
        case 'storm-night':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-night-grad)" />
                    <path d="M13 14l-2 4h3l-2 4" stroke="url(#storm-bolt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            );
        case 'storm-hail':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <path d="M13 12l-2 4h3l-2 4" stroke="url(#storm-bolt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="8" cy="18" r="1" fill="#cbd5e1" /><circle cx="16" cy="18" r="1" fill="#cbd5e1" />
                </g>
            );

        // --- SPECIALS ---
        case 'freezing-rain':
            return (
                <g filter={filter}>
                    <path d={rainCloudPath} fill="url(#cloud-grad)" />
                    <path d="M10 17l-1 2M14 17l-1 2" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
                </g>
            );

        default:
            return isNight
                ? <path d={moonPath} fill="url(#moon-grad)" filter={filter} />
                : <circle cx="12" cy="12" r="8" fill="url(#sun-grad)" filter={filter} />;
    }
}