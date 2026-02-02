import { useEffect, useState, useRef } from "react";

export default function WeatherTopBar({ location, onCitySelect }) {
    const [now, setNow] = useState(new Date());
    const [view, setView] = useState("daily");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    // 1. CLOCK LOGIC (Moved to top level)
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);



    // 2. CLICK OUTSIDE LOGIC
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);



    // 3. SEARCH LOGIC
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
                );
                const data = await res.json();
                setResults(data.results || []);
                setIsOpen(true);
            } catch (err) {
                console.error("Geocoding error:", err);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <header className="w-full h-full flex items-center justify-between px-2 gap-8">
            {/* CENTER: SEARCH */}
            <div className="flex-1 max-w-[480px] relative group" ref={dropdownRef}>
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:text-[#2DD4BF] group-focus-within:opacity-100 transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Searching in ${location}...`}
                    className="w-full h-[48px] pl-12 pr-4 text-sm bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 focus:bg-white/10 focus:border-[#2DD4BF]/40 transition-all backdrop-blur-md"
                />

                {/* SEARCH RESULTS DROPDOWN */}
                {isOpen && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
                        {results.map((res) => (
                            <button
                                key={res.id}
                                onClick={() => {
                                    onCitySelect({
                                        name: res.name,
                                        lat: res.latitude,
                                        lon: res.longitude,
                                        country: res.country
                                    });
                                    setQuery("");
                                    setIsOpen(false);
                                }}
                                className="w-full px-5 py-3 text-left hover:bg-white/5 flex items-center justify-between group transition-colors border-b border-white/5 last:border-0"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{res.name}</span>
                                    <span className="text-xs text-slate-500">{res.admin1}, {res.country}</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-600 group-hover:text-[#2DD4BF] transition-colors uppercase tracking-widest">
                                    Select
                                </span>
                            </button>
                        ))}
                    </div>
                )}
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