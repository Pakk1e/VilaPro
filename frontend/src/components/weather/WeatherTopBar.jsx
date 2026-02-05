import { useEffect, useState, useRef } from "react";

export default function WeatherTopBar({ location, onCitySelect, activeTab, subView, setSubView }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);



    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced search logic
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
        <header className="w-full h-full flex items-center justify-between px-0">
            <div className="flex items-center gap-4 flex-1">
                {/* SEARCH AREA */}
                <div className="w-full max-w-[420px] relative group" ref={dropdownRef}>
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:text-[#2DD4BF] group-focus-within:opacity-100 transition-all">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search location..."
                        className="w-full h-[48px] pl-12 pr-4 text-sm bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]/20 transition-all backdrop-blur-md"
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


            </div>


        </header>
    );
}