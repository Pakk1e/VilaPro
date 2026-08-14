export default function Brand({
    size = "md",
    showTagline = false,
    markOnly = false,
}) {
    const markSizes = {
        sm: "h-7 w-7",
        md: "h-8 w-8",
        lg: "h-10 w-10",
        xl: "h-12 w-12",
    };

    if (markOnly) {
        return (
            <img
                src="/vadovky-tech-mark.svg"
                alt="Vadovsky Tech"
                className={markSizes[size] || markSizes.md}
            />
        );
    }

    return (
        <div className="flex items-center gap-3">
            <img
                src="/vadovky-tech-mark.svg"
                alt=""
                aria-hidden="true"
                className={markSizes[size] || markSizes.md}
            />

            <div className="leading-none">
                <div className="text-[17px] font-semibold tracking-[-0.025em] text-[#0F172A]">
                    Vadovsky Tech
                </div>

                {showTagline && (
                    <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Building useful apps
                    </div>
                )}
            </div>
        </div>
    );
}
