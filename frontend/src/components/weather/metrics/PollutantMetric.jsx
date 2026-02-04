import MetricTile from "./MetricTile";
import MetricRing from "./MetricRing";
import { getPollutantSeverity } from "../utils/airQualityHelpers";

export default function PollutantMetric({ label, value, unit, max, isActive, onClick, standard }) {

    const styles = getPollutantSeverity(label, value, max, standard);

    return (
        <button
            onClick={onClick}
            className={`w-full h-full text-left transition-all duration-500 outline-none
                ${isActive ? 'scale-[0.98]' : 'hover:scale-[1.02]'}
            `}
        >
            <MetricTile
                label={label}
                className={isActive ? 'border-white/20 bg-white/10 shadow-2xl shadow-black/20' : ''}
                sub={
                    /* Bumped to 10px and font-black for better badge legibility */
                    <span className={`${styles.bgClass} px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-500 ease-in-out`}>
                        {styles.label}
                    </span>
                }
            >
                <div className="flex-1 flex flex-col items-center justify-center relative mt-2 w-full">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <MetricRing
                            value={value}
                            max={max}
                            color={styles.color}
                            size={120}
                            stroke={10}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                            {/* Main value bumped to text-3xl for punchiness */}
                            <span className="text-3xl font-[1000] text-white tracking-tighter">
                                {Math.round(value)}
                            </span>
                            {/* Unit lightened from slate-500 to slate-400 and size bumped to 10px */}
                            <span className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                                {unit}
                            </span>
                        </div>
                    </div>
                </div>
            </MetricTile>
        </button>
    );
}