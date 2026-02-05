import WeatherIcon from "../icons/WeatherIcon";
import UniversalWeatherChart from "../UniversalWeatherChart";
import MetricMini from "../metrics/MetricMini";
import WindMetric from "../metrics/WindMetric";
import RainMetric from "../metrics/RainMetric";
import UVMetric from "../metrics/UVMetric";
import CloudMetric from "../metrics/CloudMetric";
import WeeklyForecast from "../WeeklyForecast";

export default function WeatherDashboard({
    data,
    settings, // 🟢 Receive the whole settings object
    activeMetric,
    setActiveMetric,
    isNight,
    finalDateString,
    localizedTime,
    locationLabel,
    isLongName
}) {
    const { current, hourly, dailyForecast, location } = data;
    const units = settings?.units; // Extract units for labels

    // 🟢 REMOVED: formatTemp and formatWind calls. 
    // We use current.temperature and current.windSpeed directly.
    const displayTemp = Math.round(current.temperature);
    const displayFeelsLike = Math.round(current.feelsLike);

    const tempUnit = units === 'imperial' ? '°F' : '°C';
    const windUnit = units === 'imperial' ? 'mph' : 'km/h';

    const metricConfigs = {
        temperature: { label: 'Temperature', unit: tempUnit, icon: 'temp', key: 'temperature' },
        pressure: { label: 'Pressure', unit: ' hPa', icon: 'pressure', key: 'pressure' },
        humidity: { label: 'Humidity', unit: '%', icon: 'humidity', key: 'humidity' },
        wind: { label: 'Wind Speed', unit: windUnit, icon: 'wind-metric', key: 'windSpeed' }
    };

    const activeConfig = metricConfigs[activeMetric];
    const standbyKeys = Object.keys(metricConfigs).filter(key => key !== activeMetric);

    return (
        <>
            <main className="col-start-2 row-start-2 h-full min-h-0">
                <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden flex relative border border-white/50 h-full">
                    {/* Left Panel */}
                    <div className="w-[32%] flex flex-col h-full bg-gradient-to-b from-white to-slate-50/50 p-10 items-start text-left border-r border-slate-100/50">
                        <div className="w-40 h-40 mb4 drop-shadow-2xl">
                            <WeatherIcon type={current.icon} size="100%" isNight={isNight} />
                        </div>
                        <div className="w-full">
                            <span className="text-[96px] font-[1000] text-[#1E293B] leading-[0.65] tracking-[-0.08em] block">
                                {displayTemp}°
                            </span>
                        </div>
                        <div className="mt-12 w-full">
                            <h2 className={`font-[1000] text-[#1E293B] tracking-tighter leading-tight ${isLongName ? "text-xl" : "text-3xl"}`}>
                                {locationLabel}
                            </h2>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-4">
                                Feels like <span className="text-[#2DD4BF] font-[1000]">{displayFeelsLike}°</span>
                            </p>
                        </div>
                        <div className="mt-4 w-full space-y-5 pb-3">
                            <div className="w-full h-[2px] bg-slate-300" />
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4 text-slate-500">
                                    <span className="text-[16px] font-[700] tracking-tight">{finalDateString}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-800">
                                    <span className="text-xl font-[900] tabular-nums">{localizedTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Chart */}
                    <div className="flex-1 p-10 flex flex-col h-full bg-[#F8FAFC]">
                        <h2 className="text-2xl font-[1000] text-[#1E293B] mb-8">{activeConfig.label} Forecast</h2>
                        <div className="flex-1 min-h-0 w-full">
                            <UniversalWeatherChart
                                hourly={hourly}
                                activeMetricId={activeMetric}
                                units={units}
                                timezone={location.timezone}
                                currentVal={current[activeConfig.key]}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-50 mt-8">
                            {standbyKeys.map((key) => {
                                // 🟢 Use raw values from current data
                                let val = current[metricConfigs[key].key];
                                return (
                                    <button key={key} onClick={() => setActiveMetric(key)} className="text-left hover:bg-slate-50 p-2 rounded-xl transition-colors group">
                                        <MetricMini
                                            label={metricConfigs[key].label}
                                            value={`${Math.round(val)}${metricConfigs[key].unit}`}
                                            icon={metricConfigs[key].icon}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>

            {/* BOTTOM METRICS */}
            <div className="col-start-2 row-start-3 grid grid-cols-4 gap-6 self-center">
                <WindMetric speed={current.windSpeed} units={units} />
                <RainMetric chance={current.precipitationChance} />
                <UVMetric uv={current.uvIndex} />
                <CloudMetric coverage={current.cloudCover} />
            </div>

            {/* RIGHT FORECAST SIDEBAR */}
            <aside className="col-start-3 row-start-2 row-span-2 bg-[#1E293B]/50 rounded-[3rem] p-8 border border-white/5 flex flex-col h-full overflow-hidden backdrop-blur-md">
                {/* 🟢 Pass the whole settings object for timeFormat and units */}
                <WeeklyForecast hourly={hourly} daily={dailyForecast} settings={settings} timezone={location.timezone} />
            </aside>
        </>
    );
}
