export default function MetricCard({ title, children }) {
    return (
        <div
            className="
        bg-white
        rounded-[2rem]
        p-7
        h-full
        flex flex-col justify-between
        shadow-sm
        border border-slate-100
      "
        >
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {title}
            </span>

            {children}
        </div>
    );
}
