// WeatherNav.jsx refactor
export default function WeatherNav() {
    const items = [
        { label: "Dashboard", icon: "🏠", active: true },
        { label: "Maps", icon: "🗺️" },
        { label: "Charts", icon: "📈" },
        { label: "Calendar", icon: "📅" },
        { label: "Air Quality", icon: "🌫️" },
        { label: "Settings", icon: "⚙️" },
    ];

    return (
        <nav className="h-full flex flex-col py-4">
            <div className="mb-12 px-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#2DD4BF] rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <span className="text-white font-black text-xl">W</span>
                </div>
                <h1 className="text-xl font-black text-white tracking-tighter">
                    WeatherNow
                </h1>
            </div>

            <div className="flex flex-col gap-3">
                {items.map((item) => (
                    <button
                        key={item.label}
                        className={`
                            flex items-center gap-4 px-4 py-4 rounded-2xl text-sm transition-all duration-300 group
                            ${item.active
                                ? "bg-white/5 text-[#2DD4BF] font-bold shadow-sm"
                                : "text-slate-400 hover:text-white hover:bg-white/5"
                            }
                        `}
                    >
                        {/* ACTIVE DOT */}
                        {item.active && (
                            <div className="absolute left-0 w-1.5 h-6 bg-[#2DD4BF] rounded-r-full shadow-[4px_0_12px_rgba(45,212,191,0.5)]" />
                        )}

                        <span className={`text-xl transition-transform group-hover:scale-110 ${item.active ? "opacity-100" : "opacity-50"}`}>
                            {item.icon}
                        </span>
                        <span className="tracking-tight">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}