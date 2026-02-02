import WeatherIcon from "../icons/WeatherIcon";

export default function MetricMini({ icon, label, value, color = "text-[#1E293B]" }) {
    return (
        <div className="flex items-center gap-4 group">
            {/* We set text-slate-500 here so "currentColor" 
               inside WeatherIcon.jsx has something to grab.
            */}
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-500">
                <WeatherIcon type={icon} size={20} className="opacity-80" />
            </div>

            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">
                    {label}
                </span>
                <span className={`text-sm font-black ${color} tracking-tight leading-none`}>
                    {value}
                </span>
            </div>
        </div>
    );
}