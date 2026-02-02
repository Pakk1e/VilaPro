// MetricTile.jsx refactor
export default function MetricTile({ label, sub, children }) {
    return (
        <div className="bg-[#1E293B]/40 backdrop-blur-md rounded-[2.5rem] p-7 flex flex-col shadow-xl border border-white/5 h-full overflow-hidden transition-all hover:bg-[#1E293B]/60 group">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {label}
                </span>
                {sub && (
                    <span className="text-[9px] bg-[#2DD4BF]/10 text-[#2DD4BF] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border border-[#2DD4BF]/20">
                        {sub}
                    </span>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-end justify-between leading-none">
                {children}
            </div>
        </div>
    );
}