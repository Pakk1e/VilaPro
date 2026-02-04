// MetricTile.jsx refactor
export default function MetricTile({ label, sub, children, className = "" }) {
    return (
        <div className={`bg-[#1E293B]/40 backdrop-blur-md rounded-[2.5rem] p-7 flex flex-col shadow-xl border border-white/5 h-full overflow-hidden transition-all hover:bg-[#1E293B]/60 group ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {label}
                </span>
                {/* Just render sub directly so we can control its styling from the parent */}
                {sub && (
                    <div className="flex items-center">
                        {sub}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-end justify-between leading-none">
                {children}
            </div>
        </div>
    );
}