import React from 'react';

export default function SettingsDashboard({ settings, updateSetting, email, lastUpdated }) {
    const displayName = email
        ? email.split('@')[0]
            .split(/[\._]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
        : 'Guest User';

    const displayEmail = email ? email.toLowerCase() : 'No active session';

    // 🟢 Update formattedSync to respect the timeFormat setting
    const formattedSync = lastUpdated
        ? new Date(lastUpdated).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: settings.timeFormat === '12H'
        })
        : "Pending...";

    return (
        <main className="col-start-2 col-end-4 row-start-2 h-full grid grid-cols-[400px_1fr] gap-8 min-h-0">

            {/* COLUMN 1: CONSOLIDATED IDENTITY & STATUS */}
            <div className="h-full bg-[#1E293B]/40 backdrop-blur-md rounded-[3rem] p-10 flex flex-col border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-64 h-64 bg-[#2DD4BF]/5 rounded-full blur-[100px] -ml-32 -mt-32" />

                <div className="relative z-10 mb-12">
                    <span className="text-[#2DD4BF] text-[10px] font-black uppercase tracking-widest text-glow">Account Profile</span>
                    <h2 className="text-4xl font-[1000] text-white tracking-tighter leading-none mt-4">
                        {displayName}
                    </h2>
                    <p className="text-slate-500 text-xs font-black tracking-[0.2em] mt-3 opacity-60">
                        {displayEmail}
                    </p>
                </div>

                <div className="relative flex items-center justify-center mb-12">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#2DD4BF]/15 to-transparent border border-white/10 flex items-center justify-center shadow-inner group">
                        <span className="text-7xl font-[1000] text-white opacity-20 group-hover:opacity-40 transition-opacity uppercase">
                            {email ? email[0] : '?'}
                        </span>
                    </div>
                </div>

                <div className="flex-1 border-t border-white/5 pt-10">
                    <h3 className="text-white font-[1000] text-sm mb-6 uppercase tracking-widest opacity-80">System Connectivity</h3>
                    <div className="space-y-2">
                        <StatLine label="Cloud Sync" value="Verified" color="text-[#2DD4BF]" />
                        <StatLine label="Last Sync" value={formattedSync} color="text-slate-400" />
                    </div>
                </div>

                <div className="mt-auto pt-8">
                    <button
                        onClick={() => { localStorage.clear(); window.location.reload(); }}
                        className="w-full py-5 rounded-[1.5rem] bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    >
                        Reset Local Environment
                    </button>
                </div>
            </div>

            {/* COLUMN 2: LARGE SETTINGS LIST */}
            <div className="h-full bg-[#1E293B]/40 backdrop-blur-md rounded-[3rem] border border-white/5 flex flex-col min-h-0 overflow-hidden shadow-2xl ">
                <div className="p-10 border-b border-white/5 flex justify-between items-end">
                    <div>
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Preferences</span>
                        <h3 className="text-4xl font-[1000] text-white tracking-tighter mt-1">Global Configuration</h3>
                    </div>
                    <div className="bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-4 py-1.5 rounded-full">
                        <span className="text-[#2DD4BF] text-[10px] font-black uppercase tracking-widest">Active Session</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-1 scrollbar-hide">

                    <SettingListRow icon="🌡️" title="Unit System" desc="Choose between Metric (°C/kmh) and Imperial (°F/mph) measurements.">
                        <ToggleButton
                            options={['MET', 'IMP']}
                            active={settings.units === 'metric' ? 'MET' : 'IMP'}
                            onClick={(val) => updateSetting('units', val === 'MET' ? 'metric' : 'imperial')}
                        />
                    </SettingListRow>

                    <SettingListRow
                        icon="⚡"
                        title="Update Frequency"
                        desc="Control how often the system synchronizes with weather satellites."
                    >
                        <ToggleButton
                            options={['5M', '15M', '30M']}
                            active={settings.refreshRate || '15M'}
                            onClick={(val) => updateSetting('refreshRate', val)}
                        />
                    </SettingListRow>

                    <SettingListRow icon="🌍" title="AQI Standard" desc="Select the regulatory standard (EEA vs EPA) for air quality data.">
                        <ToggleButton
                            options={['EU', 'US']}
                            active={settings.aqi_standard === 'secondary' ? 'US' : 'EU'} // If US, it's 'secondary'
                            onClick={(val) => updateSetting('aqi_standard', val === 'US' ? 'secondary' : 'primary')}
                        />
                    </SettingListRow>

                    <SettingListRow icon="🕒" title="Time Format" desc="Global setting for clock displays across all modules.">
                        <ToggleButton
                            options={['24H', '12H']}
                            active={settings.timeFormat || '24H'}
                            onClick={(val) => updateSetting('timeFormat', val)}
                        />
                    </SettingListRow>

                    {/* 🟢 English is locked based on project constraints */}
                    <SettingListRow icon="🌐" title="System Language" desc="Primary language. Month names are strictly English-only.">
                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                            English
                        </div>
                    </SettingListRow>

                </div>
            </div>
        </main>
    );
}


function SettingListRow({ icon, title, desc, children }) {
    return (
        <div className="flex items-center justify-between p-6 rounded-[2.5rem] hover:bg-white/5 transition-all group border border-transparent hover:border-white/5">
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-black/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                    {icon}
                </div>
                <div>
                    <h4 className="text-white font-bold text-base tracking-tight">{title}</h4>
                    <p className="text-slate-500 text-xs font-medium leading-tight mt-1 max-w-sm">{desc}</p>
                </div>
            </div>
            <div className="ml-4 shrink-0">
                {children}
            </div>
        </div>
    );
}

function ToggleButton({ options, active, onClick }) {
    return (
        <div className="flex bg-black/40 p-1.5 rounded-2xl gap-1 w-fit border border-white/5">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onClick(opt)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${active === opt ? "bg-[#2DD4BF] text-black shadow-lg shadow-[#2DD4BF]/20" : "text-slate-500 hover:text-white"
                        }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

function StatLine({ label, value, color = "text-white" }) {
    return (
        <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            <span className={`text-xs font-black ${color}`}>{value}</span>
        </div>
    );
}