import React, { useState, useEffect } from "react";
import WeatherIcon from "./icons/WeatherIcon";
import countriesData from "./utils/countries.json";

const getCountryShortcut = (countryName) => {
    if (!countryName) return "SVK";
    const countryObj = countriesData.find(
        (c) => c.name.toLowerCase() === countryName.toLowerCase()
    );
    return countryObj ? countryObj["alpha-3"] : countryName.substring(0, 3).toUpperCase();
};

export default function WeatherSidePanel({ location, current, onCityClick }) {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hour = currentTime.getHours();
    const isNightSlot = hour >= 20 || hour < 6;

    return (
        /* Explicitly adding text-left and ensuring w-full to prevent auto-centering */
        <div className="h-full w-full flex flex-col items-start justify-start p-12 bg-white min-h-0 overflow-hidden text-left">

            {/* 1. Weather Icon - Wrap in a div to break flex-centering */}
            <div className="w-full flex justify-start mb-6">
                <WeatherIcon
                    type={current.icon}
                    isNight={isNightSlot}
                    size={130}
                    className="drop-shadow-2xl"
                />
            </div>

            {/* 2. Current Temp - Forced Left with negative margin for optical alignment */}
            <div className="w-full">
                <p className="text-[120px] font-[1000] text-[#1E293B] leading-[0.8] tracking-[-0.05em] -ml-2 text-left">
                    {Math.round(current.temperature)}°
                </p>
            </div>

            {/* 3. City & Feels Like - Block layout to prevent centering */}
            <div className="mt-12 w-full text-left">
                <button
                    onClick={onCityClick}
                    className="text-3xl font-[1000] text-[#1E293B] hover:text-[#2DD4BF] transition-colors tracking-tighter block w-full text-left"
                >
                    {location.name}, {getCountryShortcut(location.country)}
                </button>

                <div className="mt-3 w-full">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap text-left">
                        Feels like <span className="text-[#2DD4BF] font-[1000] ml-1">{Math.round(current.feelsLike)}°</span>
                    </p>
                </div>
            </div>

            {/* 4. Structural Line - Pinned Left */}
            <div className="w-48 h-[2px] bg-slate-100 my-12 self-start" />

            {/* 5. Date & Time */}
            <div className="w-full flex flex-col items-start space-y-3 text-left">
                <p className="text-[15px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long' })},
                </p>
                <p className="text-2xl font-[1000] text-[#1E293B] uppercase tracking-wide">
                    {currentTime.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}
                </p>
                <p className="text-3xl font-black text-[#2DD4BF] tracking-[0.05em] tabular-nums pt-2">
                    {currentTime.toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
        </div>
    );
}