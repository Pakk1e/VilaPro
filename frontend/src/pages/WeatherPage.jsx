import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import countriesData from "../components/weather/utils/countries.json";

import useWeatherRuntime from "../hooks/useWeatherRuntime";

import WeatherDashboard from "../components/weather/dashboards/WeatherDashboard";
import WeatherLayout from "../components/weather/dashboards/WeatherLayout";
import AirQualityDashboard from "../components/weather/dashboards/AirQualityDashboard";
import SettingsDashboard from "../components/weather/dashboards/SettingsDashboard";
import MapDashboard from "../components/weather/dashboards/MapDashboard";

const getCountryShortcut = (countryName) => {
  if (!countryName) return "---";

  const overrides = {
    "united states": "USA",
    "united states of america": "USA",
    "united kingdom": "GBR",
    uae: "ARE",
    "united arab emirates": "ARE",
  };

  const normalizedInput = countryName.toLowerCase().trim();
  if (overrides[normalizedInput]) return overrides[normalizedInput];

  const countryObj = countriesData.find(
    (c) => c.name.toLowerCase() === normalizedInput
  );

  if (countryObj) return countryObj["alpha-3"];

  return countryName.substring(0, 3).toUpperCase();
};

export default function WeatherPage() {
  const {
    city,
    setCity,
    settings,
    updatePersistentSetting,
    hasLoadedSettings,
    data,
    loading,
    currentTime,
  } = useWeatherRuntime();

  const { user } = useAuth();

  const [activeMetric, setActiveMetric] = useState("temperature");
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [subView, setSubView] = useState("primary");

  if (!hasLoadedSettings || (!data && loading)) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#2DD4BF]" />
      </div>
    );
  }

  const { current, location } = data;

  const cityTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: settings?.timeFormat === "12H",
    timeZone: data?.location?.timezone,
  });

  const localizedTime = cityTimeFormatter.format(currentTime);

  const locationLabel = `${location.name}, ${getCountryShortcut(
    location.country
  )}`;
  const isLongName = locationLabel.length > 20;

  return (
    <WeatherLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      subView={subView}
      setSubView={setSubView}
      location={data.location.name}
      temperature={data.current.temperature}
      onCitySelect={setCity}
    >
      {activeTab === "Dashboard" && (
        <WeatherDashboard
          data={data}
          settings={settings}
          activeMetric={activeMetric}
          setActiveMetric={setActiveMetric}
          localizedTime={localizedTime}
          locationLabel={locationLabel}
          isLongName={isLongName}
          viewMode={subView}
        />
      )}

      {activeTab === "Air Quality" && (
        <AirQualityDashboard
          city={city}
          standard={settings.aqi_standard}
        />
      )}

      {activeTab === "Settings" && (
        <SettingsDashboard
          settings={settings}
          updateSetting={updatePersistentSetting}
          email={user?.email}
          lastUpdated={data?.current?.updatedAt}
        />
      )}

      {activeTab === "Maps" && (
        <MapDashboard city={city} settings={settings} />
      )}
    </WeatherLayout>
  );
}
