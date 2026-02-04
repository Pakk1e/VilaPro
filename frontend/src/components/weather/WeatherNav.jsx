export default function WeatherNav({ activeTab, onTabChange }) {
    const items = [
        { label: "Dashboard", icon: "🏠" },
        { label: "Maps", icon: "🗺️" },
        { label: "Charts", icon: "📈" },
        { label: "Calendar", icon: "📅" },
        { label: "Air Quality", icon: "🌫️" },
        { label: "Settings", icon: "⚙️" },
    ];

    return (
        <nav className="h-full flex flex-col py-4">
            {/* ... Logo Section ... */}
            <div className="flex flex-col gap-3">
                {items.map((item) => {
                    const isActive = activeTab === item.label;
                    return (
                        <button
                            key={item.label}
                            onClick={() => onTabChange(item.label)}
                            className={`relative flex items-center gap-4 px-4 py-4 rounded-2xl text-sm transition-all duration-300 group
                                ${isActive ? "bg-white/5 text-[#2DD4BF] font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                        >
                            {isActive && (
                                <div className="absolute left-0 w-1.5 h-6 bg-[#2DD4BF] rounded-r-full" />
                            )}
                            <span className={`text-xl ${isActive ? "opacity-100" : "opacity-50"}`}>{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}