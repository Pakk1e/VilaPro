import { useEffect, useState } from "react";

export default function WeatherTopBar({ location, temperature }) {
    const [now, setNow] = useState(new Date());
    const [view, setView] = useState("daily");

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    return (
        <header className="w-full h-full flex items-center justify-between px-2 gap-8">

            {/* LEFT: LOCATION BREADCRUMB */}


            {/* CENTER: SEARCH (Glassmorphism) */}
            <div className="flex-1 max-w-[480px] relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:text-[#2DD4BF] group-focus-within:opacity-100 transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input
                    type="text"
                    placeholder="Search city..."
                    className="w-full h-[48px] pl-12 pr-4 text-sm bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:bg-white/10 focus:border-[#2DD4BF]/40 transition-all backdrop-blur-md"
                />
            </div>

            {/* RIGHT: TOGGLE & TIME */}
            <div className="flex items-center gap-6">
                {/* VIEW TOGGLE: The Pill Design */}
                <div className="flex items-center bg-black/20 border border-white/5 rounded-2xl p-1 h-[40px] w-[160px] relative">
                    {["daily", "weekly"].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setView(mode)}
                            className={`
                                relative z-10 flex-1 h-full rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300
                                ${view === mode ? "text-white" : "text-slate-500 hover:text-slate-300"}
                            `}
                        >
                            {mode}
                        </button>
                    ))}
                    {/* Sliding Background Indicator */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 border border-white/10 rounded-xl transition-all duration-300 ease-out shadow-xl ${view === "weekly" ? "left-[calc(50%+2px)]" : "left-1"}`}
                    />
                </div>

                {/* CLOCK: Modern Monospace feel */}

            </div>

        </header>
    );
}