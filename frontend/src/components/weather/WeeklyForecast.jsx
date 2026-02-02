import React, { useRef } from "react";
import WeatherIcon from "./icons/WeatherIcon";

export default function WeeklyForecast({ hourly = [], daily = [], timezone }) {
    const scrollRef = useRef(null);

    const handleWheel = (e) => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const cityHourNow = parseInt(
        new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            hour12: false,
            timeZone: timezone
        }).format(new Date())
    );

    // 2. FIX: Find startIndex based on the city's current hour
    const startIndex = hourly.findIndex(h => {
        const d = h.time instanceof Date ? h.time : new Date(h.time);
        // We compare the hour of the data point in the city's TZ
        const hourOfPoint = parseInt(
            new Intl.DateTimeFormat('en-GB', {
                hour: 'numeric',
                hour12: false,
                timeZone: timezone
            }).format(d)
        );
        return hourOfPoint >= cityHourNow;
    });

    const displayHourly = hourly.slice(
        startIndex !== -1 ? startIndex : 0,
        (startIndex !== -1 ? startIndex : 0) + 24 // Show full 24h if you want
    );

    return (
        <div className="h-full flex flex-col select-none overflow-hidden px-2">

            {/* 1. TOP NAVIGATION */}
            <div className="flex items-center justify-between mb-8">
                <button className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:bg-white/10 transition-all text-xl">‹</button>
                <h3 className="text-[13px] font-[1000] text-white uppercase tracking-[0.3em]">Forecast</h3>
                <button className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:bg-white/10 transition-all text-xl">›</button>
            </div>

            {/* 2. HOURLY TILES (Fixing Clipping & Readability) */}
            <div className="mb-8">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-5">Today</p>
                <div
                    ref={scrollRef}
                    onWheel={handleWheel}
                    /* Fixed: Added vertical padding (py-8) and removed negative margins to prevent clipping the scale effect */
                    className="flex gap-4 overflow-x-auto scrollbar-hide px-2 py-8 -mx-2 snap-x"
                >
                    {displayHourly.map((h, index) => {
                        const date = h.time instanceof Date ? h.time : new Date(h.time);

                        const timeString = new Intl.DateTimeFormat('en-US', {
                            hour: 'numeric',
                            hour12: true,
                            timeZone: timezone
                        }).format(date).toLowerCase().replace(' ', '');

                        return (
                            <div
                                key={index}
                                className={`flex-shrink-0 flex flex-col items-center py-4 w-[82px] rounded-[24px] border transition-all duration-500 snap-center ${index === 0
                                    ? "bg-white/15 border-[#2DD4BF]/50 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)] scale-105 z-10"
                                    : "bg-white/5 border-transparent hover:bg-white/10"
                                    }`}
                            >
                                <p className={`text-[11px] font-black uppercase tracking-tight mb-2 ${index === 0 ? "text-[#2DD4BF]" : "text-slate-400"}`}>
                                    {index === 0 ? "Now" : timeString}
                                </p>
                                {/* Icon - Slightly smaller to save vertical space */}
                                <div className="mb-2">
                                    <WeatherIcon type={h.icon} size={28} />
                                </div>
                                <p className="text-base font-[1000] text-white">
                                    {Math.round(h.temperature)}°
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. WEEKLY LIST (Increased Row Height & Font Sizes) */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">

                {daily.slice(1, 8).map((d, index) => (
                    <div key={index} className="grid grid-cols-[1.5fr_1fr_1fr] items-center py-6 border-b border-white/5 last:border-0 group">

                        <div className="flex flex-col gap-1">
                            <span className="text-[16px] font-[1000] text-white group-hover:text-[#2DD4BF] transition-colors tracking-tight">
                                {index === 0 ? "Tomorrow" : formatDay(d.date, timezone)}
                            </span>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                {formatDate(d.date, timezone)}
                            </span>
                        </div>

                        <div className="flex justify-center">
                            <span className="text-xl font-[1000] text-white tracking-tighter">
                                {Math.round(d.temperature)}°
                            </span>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-12 h-12 flex items-center justify-end">
                                <WeatherIcon type={d.icon} size={42} className="drop-shadow-xl" /> {/* Increased from 32 */}
                            </div>
                        </div>

                    </div>
                ))}
            </div>
        </div>
    );
}

/* Helpers */
function formatDay(date, timezone) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { weekday: "long", timeZone: timezone });
}

function formatDate(date, timezone) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { day: "numeric", month: "short", timeZone: timezone });
}