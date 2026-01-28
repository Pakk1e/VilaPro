import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api"

import ParkingMapModal from "../components/ParkingMapModal";
import WeatherButton from "../components/WeatherButton";
import { useWeather } from "../hooks/useWeather";
import { useNavigate } from "react-router-dom";

const WeatherModal = lazy(() => import("../components/WeatherModal"));

//const API_BASE_URL = `https://api.vadovsky-tech.com`;

// --- LEGEND COMPONENT ---
const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
    <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
  </div>
);

export default function CalendarPage() {
  const { user } = useAuth();
  const email = user?.email;

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewedDate, setViewedDate] = useState(new Date());
  const [globalPlate, setGlobalPlate] = useState("SE651BJ");
  const [processingDate, setProcessingDate] = useState(null);
  const [snipingDates, setSnipingDates] = useState([]);
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);
  const fetchRequestIdRef = useRef(0);
  const { logout } = useAuth();

  const [availability, setAvailability] = useState({
    reserved: [],
    free: [],
    full: [],
    noedit: [],
  });

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState([]);
  const [bulkRules, setBulkRules] = useState([]);
  const [editingRule, setEditingRule] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /* WEATHER */
  const weather = useWeather(true);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);

  /* MAP MODAL */
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapContext, setMapContext] = useState({
    spotName: null,
    dateLabel: null,
  });

  {/* 1. Calculate if the selected date is today or in the future */ }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureOrToday = selectedDate >= today;

  const isReservedByMe = availability.reserved.some(
    r => r.day === selectedDate.getDate()
  );



  // --- HELPER: GET DATE STRING ---
  const getDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchLogs = async () => {
    try {
      const resp = await await apiFetch(`/api/logs?email=${email}`);

      if (resp.status === 401) {
        alert("VillaPro session expired. Please log in again.");
        setIsLoggedIn(false);
        return;
      }

      const data = await resp.json();
      setActivityLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch logs");
    }
  };


  const fetchBulkRules = async () => {
    const resp = await apiFetch(`/api/bulk/rules?email=${email}`);

    if (resp.status === 401) {
      alert("VillaPro session expired. Please log in again.");
      setIsLoggedIn(false);
      return;
    }

    const data = await resp.json();
    setBulkRules(Array.isArray(data) ? data : []);
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const response = await apiFetch(`/api/bulk/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ruleData, email, id: editingRule?.id }),
      });
      if (response.ok) {
        setIsBulkModalOpen(false);
        setEditingRule(null);
        fetchBulkRules();
        // Optional: fetchBulkRules(); (to update sidebar list)
      }
    } catch (e) {
      alert("Failed to save rule.");
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Delete this automation rule?")) return;
    try {
      const response = await apiFetch(`/api/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email }),
      });
      if (response.ok) fetchBulkRules(); // Refresh sidebar
    } catch (e) {
      console.error("Delete failed", e);
    }
  };
  const handleRunRule = async (id) => {
    setLoading(true);
    try {
      const resp = await apiFetch(`/api/bulk/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, email })
      });
      if (resp.ok) {
        // REFRESH DATA IMMEDIATELY
        await fetchLogs();          // Update the history list
        await fetchData();  // Update the calendar colors
        alert("Scan complete! Calendar and logs updated.");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const formatSyncTime = () => {
    const activeEmail = email || localStorage.getItem('parkpro_email');
    const targetMonth = viewedDate.getMonth() + 1;
    const targetYear = viewedDate.getFullYear();
    const cacheKey = `parkpro_cache_${activeEmail}_${targetYear}_${targetMonth}`;

    const cachedData = sessionStorage.getItem(cacheKey);
    if (!cachedData) return "Not Synced";

    const { timestamp } = JSON.parse(cachedData);
    const date = new Date(timestamp);

    // Example: Jan 21, 15:07:30
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Helper to check if data is "stale" (older than 15 mins)
  const isStale = () => {
    const activeEmail = email || localStorage.getItem('parkpro_email');
    const cacheKey = `parkpro_cache_${activeEmail}_${viewedDate.getFullYear()}_${viewedDate.getMonth() + 1}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (!cachedData) return false;

    const { timestamp } = JSON.parse(cachedData);
    return (Date.now() - timestamp) > 900000; // 15 minutes in ms
  };

  // --- RENDER LOT ID TAGS ---
  const renderTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dayNumber = date.getDate();

    // Fix: Always use viewedDate for month comparison so navigation works
    if (date.getMonth() !== viewedDate.getMonth() || date.getFullYear() !== viewedDate.getFullYear()) return null;

    const reservedEntry = availability.reserved?.find(r => r.day === dayNumber);
    if (reservedEntry && reservedEntry.lot) {
      return (
        <div className="lot-tag-container">
          <span className="lot-tag-text">{reservedEntry.lot}</span>
        </div>
      );
    }
    return null;
  };


  // --- API: FETCH AVAILABILITY ---
  const fetchData = async (targetDate = viewedDate, isSilent = false, force = false) => {
    const activeEmail = email || localStorage.getItem('parkpro_email');
    if (!activeEmail) return;

    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();
    const cacheKey = `parkpro_cache_${activeEmail}_${targetYear}_${targetMonth}`;

    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData && !force) {
      const { availability: cachedAvailability, timestamp } = JSON.parse(cachedData);
      const isFresh = Date.now() - timestamp < 300000;

      setAvailability(cachedAvailability);

      if (isFresh && !isSilent) {
        setLoading(false);
        return;
      }
    }

    const isCurrentlyDisplayed =
      targetMonth === viewedDate.getMonth() + 1 &&
      targetYear === viewedDate.getFullYear();

    if (isSilent && availability.free.length > 0 && isCurrentlyDisplayed) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;
    const requestId = ++fetchRequestIdRef.current;

    if (!isSilent) setLoading(true);

    try {
      const response = await apiFetch(
        `/api/availability?month=${targetMonth}&year=${targetYear}&email=${encodeURIComponent(activeEmail)}`,
        { signal }
      );



      if (response.status === 401) {
        alert("VillaPro session expired. Please log in again.");
        setIsLoggedIn(false);
        return;
      }

      if (response.status === 403) {
        alert("Your access has been revoked.");
        logout();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const backendTimestamp = Date.now();

        const backendAvailability = {
          reserved: data.reserved || [],
          free: data.free || [],
          full: data.full || [],
          noedit: data.noedit || []
        };

        if (fetchRequestIdRef.current === requestId) {
          setAvailability(prev => {
            const optimisticReserved = prev.reserved || [];
            const backendReserved = backendAvailability.reserved || [];

            const mergedReserved = optimisticReserved.map(opt => {
              const backendMatch = backendReserved.find(b => b.day === opt.day);
              return backendMatch ? { ...opt, ...backendMatch } : opt;
            });

            backendReserved.forEach(b => {
              if (!mergedReserved.some(r => r.day === b.day)) {
                mergedReserved.push(b);
              }
            });

            const mergedAvailability = {
              ...backendAvailability,
              reserved: mergedReserved
            };

            // ✅ Cache EXACTLY what we apply
            sessionStorage.setItem(cacheKey, JSON.stringify({
              availability: mergedAvailability,
              timestamp: backendTimestamp
            }));

            return mergedAvailability;
          });
        }

        if (data.activePlate) setGlobalPlate(data.activePlate);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Sync error:", error);
      }
    } finally {
      if (fetchRequestIdRef.current === requestId && !isSilent) {
        setLoading(false);
      }
    }
  };


  // --- API: LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.status === 'success') {
        localStorage.setItem('parkpro_email', email);
        setIsLoggedIn(true);
        fetchData();
      } else {
        alert(data.message || "VillaPro Authentication Failed.");
      }
    } catch (error) {
      alert("Backend unreachable.");
    } finally {
      setLoading(false);
    }
  };




  // --- API: TOGGLE RESERVATION ---
  const handleAction = async (dateObj) => {
    if (dateObj.getMonth() !== selectedDate.getMonth()) return;

    const dayNum = dateObj.getDate();
    if (availability.noedit.includes(dayNum)) return;

    const year = dateObj.getFullYear();
    const monthInt = dateObj.getMonth() + 1; // 1-12
    const dateStr = getDateStr(dateObj); // YYYY-MM-DD
    const activeEmail = email || localStorage.getItem('parkpro_email');
    const existingRes = availability.reserved.some(r => r.day === dayNum);
    const command = existingRes ? 'DEL' : 'ADD';

    setProcessingDate(dayNum);

    try {
      const response = await apiFetch(`/api/reservations/instant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          date: dateStr,
          plate: globalPlate,
          command: command
        }),
      });

      const result = await response.json();
      if (result.status || result.success) {
        // --- OPTIMISTIC UPDATE: Update UI immediately without full fetch ---
        setAvailability(prev => {
          let newReserved = [...prev.reserved];
          let newFree = [...prev.free];

          if (command === 'ADD') {
            // Remove from free, add to reserved
            newFree = newFree.filter(d => d !== dayNum);
            newReserved.push({ day: dayNum, lot: result.lot_id || result.lot || '...' });
          } else {
            // Remove from reserved, add back to free
            newReserved = newReserved.filter(r => r.day !== dayNum);
            if (!newFree.includes(dayNum)) newFree.push(dayNum);
          }

          const updatedState = { ...prev, reserved: newReserved, free: newFree };

          // Update Cache so refresh doesn't break it
          const cacheKey = `parkpro_cache_${activeEmail}_${year}_${monthInt}`;
          sessionStorage.setItem(cacheKey, JSON.stringify({
            availability: updatedState,
            timestamp: Date.now()
          }));

          return updatedState;
        });
        const activeEmail = email || localStorage.getItem('parkpro_email');
        // Optional: silent background refresh
        fetchData(dateObj, true, true);
      } else {
        alert(`VillaPro Message: ${result.message || "Action rejected"}`);
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setProcessingDate(null);
    }
  };

  // --- API: SNIPER ACTIONS ---
  const startSniper = async (dateObj) => {
    const dateStr = getDateStr(dateObj); // Use full string YYYY-MM-DD

    try {
      const response = await apiFetch(`/api/sniper/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, date: dateStr, plate: globalPlate }),
      });
      const result = await response.json();
      if (result.success) {
        setSnipingDates(prev => [...prev, dateStr]); // Add to active list
      }
    } catch (error) {
      console.error("Sniper error:", error);
    }
  };

  const stopSniper = async (dateObj) => {
    const dateStr = getDateStr(dateObj);

    try {
      await apiFetch(`/api/sniper/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, date: dateStr }),
      });
      setSnipingDates(prev => prev.filter(d => d !== dateStr)); // Remove from active list
    } catch (error) {
      console.error("Stop sniper error:", error);
    }
  };

  const syncActiveSnipers = async () => {
    if (!email) return;
    try {
      const resp = await apiFetch(`/api/sniper/active?email=${email}`);

      if (resp.status === 401) {
        alert("VillaPro session expired. Please log in again.");
        setIsLoggedIn(false);
        return;
      }

      const activeDates = await resp.json();
      setSnipingDates(Array.isArray(activeDates) ? activeDates : []);
    } catch (e) {
      console.error("Failed to sync snipers", e);
    }
  };




  // --- DYNAMIC TILE CLASSES ---
  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const dayNum = date.getDate();
    const dateStr = getDateStr(date);

    if (date.getMonth() !== viewedDate.getMonth() || date.getFullYear() !== viewedDate.getFullYear()) {
      return 'vp-neighboring-day';
    }
    if (loading && availability.free.length === 0) return 'vp-tile-loading';

    const dayNumber = date.getDate();
    let classes = [];

    // Logic for Today's Indicator
    const today = new Date();
    if (
      view === 'month' &&
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      classes.push('calendar-today-tile');
    }

    if (availability.noedit?.includes(dayNumber)) classes.push('vp-unavailable');
    if (availability.full?.includes(dayNumber)) classes.push('vp-full');
    if (availability.free?.includes(dayNumber)) classes.push('vp-free');

    // Priority styling
    if (snipingDates.includes(dateStr)) {
      classes.push('vp-sniping-active');
    }

    if (availability.reserved?.some(r => r.day === dayNumber)) {
      classes = classes.filter(c => c !== 'vp-full');
      classes.push('vp-my-spot');
    }

    if (processingDate === dayNumber) classes.push('vp-processing');

    return classes.length > 0 ? classes.join(' ') : null;
  };

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);


  useEffect(() => {
    if (!isSidebarOpen) return;

    const preventScroll = (e) => {
      e.preventDefault();
    };

    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [isSidebarOpen]);



  useEffect(() => {
    if (!email) return;
    setAvailability({ reserved: [], free: [], full: [], noedit: [] });
    fetchBulkRules();
    fetchLogs()
    fetchData(viewedDate);
    syncActiveSnipers(); // Initial sync
    const interval = setInterval(() => fetchData(viewedDate, true), 300000);
    const intervalSnipeSync = setInterval(syncActiveSnipers, 10000); // Sync every 10 seconds
    return () => {
      clearInterval(interval);
      clearInterval(intervalSnipeSync);
      // Clean up: Abort any pending request if the component unmounts or viewedDate changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [email, viewedDate]);

  useEffect(() => {
    if (isLogsOpen) {
      fetchLogs();
    }
  }, [isLogsOpen]); // Triggers when the Logs modal is opened

  const ActionButton = ({ className = "" }) => {
    const isSnipingTarget =
      !isReservedByMe && (availability.full.includes(selectedDate.getDate()) ||
        availability.noedit.includes(selectedDate.getDate())) &&
      !snipingDates.includes(getDateStr(selectedDate)) &&
      isFutureOrToday;

    if (isSnipingTarget) {
      return (
        <button
          onClick={() => startSniper(selectedDate)}
          className={
            "w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest " +
            "hover:bg-red-500 transition-all shadow-lg shadow-red-500/40 " +
            className
          }
        >
          🎯 Initialize Snipe
        </button>
      );
    }

    if (snipingDates.includes(getDateStr(selectedDate))) {
      return (
        <button
          onClick={() => stopSniper(selectedDate)}
          className={
            "w-full bg-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest " +
            "hover:bg-slate-700 transition-all border border-slate-700 " +
            className
          }
        >
          🛑 Stop Sniping
        </button>
      );
    }

    return (
      <button
        onClick={() => handleAction(selectedDate)}
        disabled={processingDate !== null || availability.noedit.includes(selectedDate.getDate())}
        className={
          "w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest " +
          "hover:bg-blue-500 transition-all disabled:opacity-50 " +
          className
        }
      >
        {processingDate ? "Processing..." : (isReservedByMe ? "Delete" : "Reserve Spot")}
      </button>
    );
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 w-full">
        {/* MOBILE HEADER */}
        <div className="lg:hidden h-14 flex items-center justify-between px-4">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            PARK <span className="text-blue-600">PRO</span>
          </h1>
          <div className="flex items-center gap-3">
            <WeatherButton
              weather={weather.data}
              status={weather.status}
              onClick={() => setIsWeatherOpen(true)}
              className="opacity-70 hover:opacity-100 overflow-visible"
            />

            <button
              onClick={() => navigate("/hub")}
              className="text-sm font-bold text-slate-500 hover:text-slate-900 transition"
            >
              ← Back to Hub
            </button>


            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-900 text-xl"
              aria-label="Open menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* DESKTOP HEADER */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4">
          {/* LEFT */}
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
              PARK <span className="text-blue-600">PRO</span>
            </h1>



            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 mr-3 uppercase">
                  Active Plate:
                </span>
                <input
                  className="bg-transparent border-none outline-none font-black text-blue-600 w-24"
                  value={globalPlate}
                  onChange={(e) => setGlobalPlate(e.target.value.toUpperCase())}
                />
              </div>

              <button
                onClick={() => setIsLogsOpen(true)}
                className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200"
                title="Activity Logs"
              >
                📄
              </button>



              <button
                onClick={() => {
                  setEditingRule(null);
                  setIsBulkModalOpen(true);
                }}
                className="bg-blue-600 text-white text-[10px] font-bold px-4 py-2.5 rounded-2xl uppercase tracking-widest"
              >
                ⚙️ Bulk Scheduler
              </button>
            </div>
          </div>


          {/* RIGHT */}
          <div className="flex items-center gap-4">


            <div className="flex items-center gap-6">
              {/* WEATHER — LEFT OF STATUS */}
              <WeatherButton
                weather={weather.data}
                status={weather.status}
                onClick={() => setIsWeatherOpen(true)}
                className="opacity-70 hover:opacity-100 overflow-visible"
              />
              <button
                onClick={() => navigate("/hub")}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 transition"
              >
                ← Back to Hub
              </button>


              {/* STATUS + SYNC */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <p className={`text-[10px] font-bold uppercase ${isStale() ? 'text-orange-500' : 'text-slate-400'}`}>
                    Status: {isStale() ? 'Stale Data' : 'Connected'}
                  </p>

                  <button
                    onClick={() => fetchData(viewedDate, false, true)}
                    className="text-slate-400 hover:text-blue-600"
                    title="Force Sync"
                  >
                    ⟳
                  </button>
                </div>

                <p className="text-[9px] font-medium text-slate-400">
                  Sync: {formatSyncTime()}
                </p>
                <p className="text-xs font-bold text-slate-600">{email}</p>
              </div>

              {/* LOGOUT */}
              <button
                onClick={logout}
                className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </header>


      {/* MAIN GRID */}
      <main
        className={
          "flex-grow flex flex-col lg:flex-row gap-6 px-4 py-4 lg:px-8 lg:py-8 " +
          (isSidebarOpen ? "overflow-hidden" : "overflow-y-auto")
        }
      >


        {/* CALENDAR SECTION */}
        <div className="w-full lg:w-2/3 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-4 lg:p-8 flex flex-col">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 lg:mb-6 gap-2">
            <h2 className="text-lg lg:text-xl font-bold text-slate-800">
              VillaPro Live Map
            </h2>
            <div className="flex gap-3 text-xs lg:text-sm">
              <LegendItem color="bg-green-500" label="Free" />
              <LegendItem color="bg-red-500" label="Full" />
              <LegendItem color="bg-blue-600" label="Your Spot" />
              <LegendItem color="bg-red-600 animate-pulse" label="Sniping" />
            </div>
          </div>

          <div className="calendar-container">
            {loading && (
              <div className="loading-spinner-overlay">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                Syncing with VillaPro...
              </div>
            )}

            <Calendar
              key={`${email}-${viewedDate.getMonth()}-${viewedDate.getFullYear()}`}
              locale="en-US"
              calendarType="iso8601"
              onChange={setSelectedDate}
              onClickDay={(date) => setSelectedDate(date)}
              activeStartDate={viewedDate} // This is the key fix for the header label
              onActiveStartDateChange={({ activeStartDate }) => {
                if (activeStartDate.getMonth() !== viewedDate.getMonth() || activeStartDate.getFullYear() !== viewedDate.getFullYear()) {
                  setAvailability({ reserved: [], free: [], full: [], noedit: [] });
                  setViewedDate(activeStartDate);
                  // fetchData(activeStartDate); // Keep this commented out if your useEffect already handles viewedDate
                }
              }}
              onDrillDown={({ activeStartDate }) => setViewedDate(activeStartDate)}
              value={selectedDate}
              tileClassName={getTileClassName}
              tileContent={renderTileContent}
              className={`main-dashboard-calendar ${loading ? 'calendar-loading' : ''}`}
            />
          </div>
        </div>

        {/* ================= MOBILE OVERLAY ================= */}
        <div
          className={
            "fixed inset-0 z-45 bg-black/40 " +
            (isSidebarOpen ? "block " : "hidden ") +
            "lg:hidden"
          }
          onClick={() => setIsSidebarOpen(false)}
        ></div>

        {/* ================= SIDEBAR DRAWER ================= */}
        <div
          className={
            /* MOBILE ONLY */
            "fixed top-0 right-0 z-50 h-full w-[90%] max-w-sm bg-white " +
            "transform transition-transform duration-300 " +
            (isSidebarOpen ? "translate-x-0 " : "translate-x-full ") +

            /* DESKTOP — REMOVE WIDTH CAP */
            "lg:relative lg:inset-auto lg:z-auto lg:h-auto lg:w-1/3 lg:max-w-none " +
            "lg:transform-none lg:translate-x-0 " +

            /* SHARED */
            "flex flex-col gap-4 lg:gap-6 p-4 lg:p-0" +

            /* ENABLE SCROLLING */
            "overflow-y-auto overscroll-contain"
          }
        >
          {/* MOBILE CLOSE BUTTON */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden self-end text-slate-400 font-bold mb-2"
          >
            ✕
          </button>


          {/* ================= MOBILE HEADER INFO ================= */}
          <div className="lg:hidden space-y-4 px-2">

            {/* STATUS + REFRESH */}
            <div className="grid grid-cols-[1fr_auto] grid-rows-2 gap-x-3 gap-y-0 items-center">
              {/* STATUS (ROW 1) */}
              <p className={`text-xs font-bold uppercase ${isStale() ? 'text-orange-500' : 'text-slate-600'}`}>
                Status: {isStale() ? 'Stale Data' : 'Connected'}
              </p>

              {/* RELOAD (SPANS BOTH ROWS, CENTERED) */}
              <button
                onClick={() => fetchData(viewedDate, false, true)}
                className="row-span-2 flex items-center justify-center w-9 h-9 rounded-full text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                title="Force Sync"
              >
                ⟳
              </button>

              {/* SYNC (ROW 2) */}
              <p className="text-[11px] font-medium text-slate-500">
                Sync: {formatSyncTime()}
              </p>
            </div>


            {/*Divider*/}
            <div className="h-px bg-slate-200" />

            {/* EMAIL */}
            <p className="text-sm text-slate-700 break-all">
              <span className="font-medium text-slate-500 mr-1">
                Signed in as
              </span>
              <span className="font-bold">
                {email}
              </span>
            </p>

            {/* ACTIVE PLATE */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">
                Active Plate
              </span>
              <input
                className="w-32 bg-slate-100 rounded-xl px-3 py-2 font-black text-blue-600 tracking-widest"
                maxLength={10}
                value={globalPlate}
                onChange={(e) => setGlobalPlate(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          {/*Divider*/}
          <div className="h-px bg-slate-200 lg:hidden" />

          {/* ================= YOUR RESERVATIONS ================= */}
          <div className="flex-grow bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {snipingDates.length > 0 && (
              <div className="p-6 border-b border-slate-100 bg-red-50/50 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-3">
                  <p className="font-black text-red-600 uppercase text-[11px] tracking-[0.15em]">
                    Live Sniper Targets
                  </p>
                  <span className="text-[10px] font-bold text-red-400 animate-pulse">● LIVE</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {snipingDates.map(dateStr => {
                    const [y, m, d] = dateStr.split('-');
                    const targetDate = new Date(y, m - 1, d);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => {

                          const isDifferentMonth = targetDate.getMonth() !== viewedDate.getMonth() ||
                            targetDate.getFullYear() !== viewedDate.getFullYear();

                          setSelectedDate(targetDate);

                          if (isDifferentMonth) {
                            // 1. Clear current view so user sees it's loading new data
                            setAvailability({ reserved: [], free: [], full: [], noedit: [] });
                            // 2. Update the calendar view
                            setViewedDate(targetDate);
                            // 3. FORCE a fetch for the new month immediately
                            fetchData(targetDate);
                          }
                        }}
                        className="group relative flex items-center gap-2 bg-white border-2 border-red-500 text-red-600 px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm"
                      >
                        <span className="text-xs font-black tracking-tighter">
                          {targetDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()} {d}
                        </span>
                        <span className="text-sm group-hover:rotate-12 transition-transform">🎯</span>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="p-6 border-b border-slate-100 font-bold text-slate-800 uppercase text-xs tracking-wider">Your Reservations</div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {availability.reserved.length > 0 ? (
                availability.reserved
                  .sort((a, b) => a.day - b.day)
                  .map((res) => (
                    <div
                      key={res.day}
                      onClick={() =>
                        setSelectedDate(
                          new Date(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth(),
                            res.day
                          )
                        )
                      }
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                            {viewedDate.toLocaleString("en-US", { month: "long" })} {res.day}
                          </p>
                          <p className="font-black text-slate-800">
                            Spot {res.lot || "..."}
                          </p>

                          {(!res.lot || res.lot === "...") && (
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                              <span className="animate-pulse">⏳</span>
                              Confirming
                            </p>
                          )}

                        </div>

                        <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-green-100 text-green-600 border border-green-200">
                          {globalPlate}
                        </span>
                      </div>

                      {/* DESKTOP ONLY — SHOW MAP */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // IMPORTANT
                          setMapContext({
                            spotName: res.lot,
                            dateLabel: `${viewedDate.toLocaleString("en-US", {
                              month: "long",
                            })} ${res.day}`,
                          });
                          setIsMapOpen(true);
                        }}
                        className="hidden lg:inline-flex text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                      >
                        Show Map
                      </button>
                    </div>

                  ))
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No active reservations found
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 font-bold text-slate-800 uppercase text-xs tracking-wider">
              Automation Templates
            </div>
            <div className="p-4 space-y-3">
              {bulkRules.map(rule => (
                <div key={rule.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    {/*<p className="text-[10px] font-black text-blue-600 uppercase">Weekly Schedule</p>*/}
                    <h4 className="font-black text-slate-900">{rule.name || "Unnamed Rule"}</h4>
                    <p className="text-[11px] font-bold text-slate-600">Plate: {rule.plate}</p>
                  </div>
                  {/* Edit/Delete buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingRule(rule); setIsBulkModalOpen(true); }} className="text-slate-400 hover:text-blue-600">Edit</button>
                    <button onClick={() => handleDeleteRule(rule.id)} className="text-slate-400 hover:text-red-600">Delete</button>
                    <button onClick={() => handleRunRule(rule.id)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Run Now">▶️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/*Divider*/}
          <div className="h-px bg-slate-200 lg:hidden" />



          {/* ================= MOBILE ACTIONS ================= */}
          <div className="lg:hidden flex flex-col gap-2 px-2">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsLogsOpen(true)}
                className="bg-slate-100 rounded-xl px-4 py-1.5 font-bold text-sm"
              >
                Logs
              </button>

              <button
                onClick={() => {
                  setEditingRule(null);
                  setIsBulkModalOpen(true);
                }}
                className="bg-blue-600 text-white rounded-xl px-4 py-2 font-bold text-sm"
              >
                Bulk Scheduler
              </button>

              <button
                onClick={logout}
                className="bg-red-50 text-red-600 rounded-xl px-4 py-2 font-bold text-sm"
              >
                Logout
              </button>
            </div>
          </div>



          {/* SIDEBAR */}


          <div className="hidden lg:block bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            {snipingDates && (
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Sniper Active</span>
              </div>
            )}

            <p className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-1">Selection</p>
            <p className="text-2xl font-black mb-4">
              {selectedDate.getMonth() === viewedDate.getMonth()
                ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                : viewedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              }
            </p>

            {!isReservedByMe && (availability.full.includes(selectedDate.getDate()) || availability.noedit.includes(selectedDate.getDate()))
              && !snipingDates.includes(getDateStr(selectedDate)) // Check full string here
              && isFutureOrToday ? (
              <button
                onClick={() => startSniper(selectedDate)}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/40 transition-[background-color,box-shadow,transform] duration-300 ease-in-out"
              >
                🎯 Initialize Snipe
              </button>
            ) : snipingDates.includes(getDateStr(selectedDate)) ? (
              <button
                onClick={() => stopSniper(selectedDate)}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-[background-color,box-shadow,transform] duration-300 ease-in-out"
              >
                🛑 Stop Sniping
              </button>
            ) : (
              <button
                onClick={() => handleAction(selectedDate)}
                disabled={processingDate !== null || availability.noedit.includes(selectedDate.getDate())}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 transition-[background-color,box-shadow,transform] duration-300 ease-in-out disabled:opacity-50"
              >
                {processingDate ? "Processing..." : (isReservedByMe ? "Delete" : "Reserve Spot")}
              </button>
            )}
          </div>



        </div>
        {/* ================= MOBILE STICKY ACTION BAR ================= */}
        <div
          className={
            "lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 transition-all " +
            (isSidebarOpen ? "pointer-events-none" : "")
          }

          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
        >
          <div
            className="max-w-md mx-auto bg-white rounded-2xl shadow-md border border-slate-200 px-3 py-3 flex items-center justify-center ">
            <div className="w-full">
              <ActionButton />
            </div>
          </div>
        </div>

      </main>
      {/* ADD THESE TWO LINES HERE */}
      <BulkActionModal
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false)
          setEditingRule(null);
        }}
        onSave={handleSaveRule} // You'll need to define this function
        activePlate={globalPlate}
        editingRule={editingRule}
        bulkRules={bulkRules}
      />

      <LogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={activityLogs}
      />

      <ParkingMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        spotName={mapContext.spotName}
        dateLabel={mapContext.dateLabel}
      />

      <Suspense fallback={null}>
        <WeatherModal
          isOpen={isWeatherOpen}
          onClose={() => setIsWeatherOpen(false)}
          weather={weather.data}
        />
      </Suspense>



    </div >
  );
}


const BulkActionModal = ({ isOpen, onClose, onSave, activePlate, editingRule, bulkRules }) => {
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [plate, setPlate] = useState(activePlate);
  const [ruleName, setRuleName] = useState(editingRule?.name || '')

  useEffect(() => {
    if (editingRule) {
      setSelectedDays(JSON.parse(editingRule.days_of_week));
      setSelectedMonths(JSON.parse(editingRule.months));
      setPlate(editingRule.plate);
      setRuleName(editingRule.name || ''); // Load the existing name
    } else {
      setSelectedDays([]);
      setSelectedMonths([]);
      setPlate(activePlate);
      setRuleName('');
    }
  }, [editingRule, isOpen]);

  if (!isOpen) return null;

  // 2. This is the new internal function to handle your "Smart Logic"
  const handleSaveInternal = () => {
    console.log("Save button clicked!");
    let finalDays = [...selectedDays];
    let finalMonths = [...selectedMonths];

    // If Months picked but NO Days -> Default to Workdays (Mon-Fri)
    if (finalMonths.length > 0 && finalDays.length === 0) {
      finalDays = [1, 2, 3, 4, 5];
    }

    // If Days picked but NO Months -> Default to All Months
    if (finalDays.length > 0 && finalMonths.length === 0) {
      finalMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    const ruleCount = bulkRules ? bulkRules.length : 0;

    // 3. Construct the payload
    const payload = {
      id: editingRule?.id,
      name: ruleName || `Rule ${ruleCount + 1}`,
      days: finalDays,
      months: finalMonths,
      plate: plate || activePlate // Fallback to activePlate if state is empty
    };

    console.log("Payload being sent to handleSaveRule:", payload);

    // 4. Call the parent function
    onSave(payload);
  };

  const days = [
    { id: 1, label: 'Mon' }, { id: 2, label: 'Tue' }, { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' }, { id: 5, label: 'Fri' }, { id: 6, label: 'Sat' }, { id: 0, label: 'Sun' }
  ];

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl border border-slate-200">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Bulk Scheduler</h2>
        <div className="space-y-6">
          {/* 3. New Name Input Field */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Rule Name</label>
            <input
              type="text"
              placeholder="e.g., My Monday Snipers"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full mt-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Day Selector */}
          <div className="flex gap-2 flex-wrap">
            {days.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDays(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                className={`px-4 py-2 rounded-xl font-bold text-xs border-2 transition-all ${selectedDays.includes(d.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-100 text-slate-400'}`}
              >{d.label}</button>
            ))}
          </div>

          {/* Month Selector */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400">Active Months</label>
            <div className="grid grid-cols-4 gap-2">
              {monthNames.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonths(prev =>
                    prev.includes(idx + 1) ? prev.filter(x => x !== idx + 1) : [...prev, idx + 1]
                  )}
                  className={`py-2 rounded-xl font-bold text-[10px] border-2 transition-all ${selectedMonths.includes(idx + 1) ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 text-slate-400'
                    }`}
                >{m}</button>
              ))}
            </div>
          </div>

          {/* Plate Input */}
          <input
            className="w-full p-4 bg-slate-100 rounded-2xl font-bold outline-none border-2 focus:border-blue-600 transition-all"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="PLATE NUMBER"
          />
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
            <button
              onClick={handleSaveInternal}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black"
            >
              {editingRule ? 'Update Rule' : 'Save Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- LOGS MODAL ---
const LogsModal = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-900">Activity History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        <div className="overflow-y-auto space-y-3 pr-2">
          {logs.map((log, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-blue-600 mb-1">{log.timestamp}</p>
              <p className="text-xs font-bold text-slate-700">{log.message}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="text-center text-slate-400 py-10">No recent activity</p>}
        </div>
      </div>
    </div>
  );
};
