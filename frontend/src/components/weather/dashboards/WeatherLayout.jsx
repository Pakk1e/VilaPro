import WeatherNav from "../WeatherNav";
import WeatherTopBar from "../WeatherTopBar";

export default function WeatherLayout({ children, activeTab, setActiveTab, subView, setSubView, location, onCitySelect }) {
    return (
        <div className="h-screen max-h-screen bg-[#0F172A] p-6 lg:p-8 text-white overflow-hidden font-sans">
            <div className="h-full grid grid-cols-[240px_1.6fr_0.8fr] grid-rows-[60px_1fr_auto] gap-6">

                <aside className="row-span-3 flex flex-col">
                    <WeatherNav activeTab={activeTab} onTabChange={setActiveTab} />
                </aside>

                <header className="col-start-2 col-span-2 flex items-center">
                    <WeatherTopBar
                        activeTab={activeTab}
                        subView={subView}
                        setSubView={setSubView}
                        location={location}
                        onCitySelect={onCitySelect}
                    />
                </header>

                {children}
            </div>
        </div>
    );
}