import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const API_BASE_URL = `https://api.vadovsky-tech.com`;

// --- LEGEND COMPONENT ---
const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
    <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
  </div>
);

function App() {
  const [email, setEmail] = useState(localStorage.getItem('parkpro_email') || '');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('parkpro_email'));
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewedDate, setViewedDate] = useState(new Date());
  const [globalPlate, setGlobalPlate] = useState('SE651BJ');
  const [processingDate, setProcessingDate] = useState(null);
  const [snipingDates, setSnipingDates] = useState([]);
  const abortControllerRef = useRef(null);
  const [availability, setAvailability] = useState({
    reserved: [],
    free: [],
    full: [],
    noedit: []
  });
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false); // Fixes the first error
  const [isLogsOpen, setIsLogsOpen] = useState(false);         // Fixes the second error
  const [activityLogs, setActivityLogs] = useState([]);       // To store your milestones
  const [bulkRules, setBulkRules] = useState([]);             // To store your automation rules
  const [editingRule, setEditingRule] = useState(null);       // For the edit functionality
  {/* 1. Calculate if the selected date is today or in the future */ }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureOrToday = selectedDate >= today;


  // --- HELPER: GET DATE STRING ---
  const getDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchLogs = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/logs?email=${email}`);
      const data = await resp.json();
      setActivityLogs(data);
    } catch (e) {
      console.error("Failed to fetch logs");
    }
  };

  const fetchBulkRules = async () => {
    const resp = await fetch(`${API_BASE_URL}/api/bulk/rules?email=${email}`);
    const data = await resp.json();
    setBulkRules(data);
  };
  const handleSaveRule = async (ruleData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bulk/save`, {
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
      const response = await fetch(`${API_BASE_URL}/api/bulk/delete`, {
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
      const resp = await fetch(`${API_BASE_URL}/api/bulk/run`, {
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

  // Add a variable outside the component or in a ref to track the controller
  let currentAbortController = null;

  // --- API: FETCH AVAILABILITY ---
  const fetchData = async (targetDate = viewedDate, isSilent = false, force = false) => {
    const activeEmail = email || localStorage.getItem('parkpro_email');
    if (!activeEmail) return;

    // 1. DEFINE THESE FIRST
    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();


    // Updated Cache Key: Includes email to prevent cross-user data leaks
    const cacheKey = `parkpro_cache_${activeEmail}_${targetYear}_${targetMonth}`;

    // --- NEW: Read from Cache ---
    const cachedData = sessionStorage.getItem(cacheKey);
    let isFresh = false;
    if (cachedData && !force) {
      const { availability: cachedAvailability, timestamp } = JSON.parse(cachedData);
      const isFresh = Date.now() - timestamp < 300000; // 5 minutes

      // Update UI immediately with cached data
      setAvailability(cachedAvailability);

      // If it's very fresh and we aren't forcing a refresh, we can even skip the API call
      if (isFresh && !isSilent) {
        setLoading(false);
        return;
      }
    }
    // ---------------------------


    // Guard Logic: 
    // Only skip if: It's a silent background refresh AND the month is already loaded
    const isCurrentlyDisplayed = targetMonth === (viewedDate.getMonth() + 1) &&
      targetYear === viewedDate.getFullYear();

    // ONLY guard if we are doing a silent refresh on the same month.
    // If it's NOT silent (user clicked something), we WANT to allow the fetch.
    if (isSilent && availability.free.length > 0 && isCurrentlyDisplayed) {
      return;
    }
    // 3. ABORT PREVIOUS REQUEST
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    if (!isSilent) setLoading(true);

    try {
      // Use the variables we defined at the top
      const url = `${API_BASE_URL}/api/availability?month=${targetMonth}&year=${targetYear}&email=${encodeURIComponent(activeEmail)}`;
      const response = await fetch(url, { signal });

      if (response.status === 403) {
        alert("Your access has been revoked.");
        handleLogout(); // This function already clears storage and reloads
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const syncTimestamp = Date.now(); // CAPTURE CURRENT TIME

        const newAvailability = {
          reserved: data.reserved || [],
          free: data.free || [],
          full: data.full || [],
          noedit: data.noedit || []
        };
        // --- NEW: Save to Cache ---
        const cacheKey = `parkpro_cache_${activeEmail}_${targetYear}_${targetMonth}`;
        sessionStorage.setItem(cacheKey, JSON.stringify({
          availability: newAvailability,
          timestamp: syncTimestamp
        }));
        // -------------------------

        setAvailability(newAvailability);

        if (data.activePlate) setGlobalPlate(data.activePlate);
        setLoading(false);
      }
    } catch (error) {
      // Only handle errors that aren't caused by us canceling the request
      if (error.name === 'AbortError') {
        console.log('Previous request cancelled - moving to new month.');
      } else {
        console.error("Sync error:", error);
        setLoading(false);
      }
    }
  };

  // --- API: LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.status === 'success' && data.status === 'success') {
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

  const handleLogout = () => {
    localStorage.removeItem('parkpro_email');
    window.location.reload();
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
      const response = await fetch(`${API_BASE_URL}/api/reservations/instant`, {
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
        sessionStorage.removeItem(`parkpro_cache_${activeEmail}_${year}_${monthInt}`);
        await fetchData(dateObj, true);
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
      const response = await fetch(`${API_BASE_URL}/api/sniper/start`, {
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
      await fetch(`${API_BASE_URL}/api/sniper/stop`, {
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
    try {
      const resp = await fetch(`${API_BASE_URL}/api/sniper/active?email=${email}`);
      const activeDates = await resp.json();
      setSnipingDates(activeDates); // This updates your "sniping stack" UI
    } catch (e) {
      console.error("Failed to sync snipers", e);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setViewedDate(today);
    fetchData(today);
  };

  // --- DYNAMIC TILE CLASSES ---
  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const dayNum = date.getDate();
    const dateStr = getDateStr(date);

    if (date.getMonth() !== viewedDate.getMonth() || date.getFullYear() !== selectedDate.getFullYear()) {
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
    if (isLoggedIn) {
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
    }
  }, [isLoggedIn, viewedDate]);

  useEffect(() => {
    if (isLoggedIn && isLogsOpen) {
      fetchLogs();
    }
  }, [isLoggedIn, isLogsOpen]); // Triggers when the Logs modal is opened

  if (isLoggedIn) {
    return (
      <div className="dashboard-container">
        {/* HEADER */}
        <header className="h-24 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">PARK <span className="text-blue-600">PRO</span></h1>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 mr-3 uppercase">Active Plate:</span>
                <input
                  className="bg-transparent border-none outline-none font-black text-blue-600 w-24"
                  value={globalPlate}
                  onChange={(e) => setGlobalPlate(e.target.value.toUpperCase())}
                />
              </div>
              {/* Activity Logs Button */}
              <button
                onClick={() => setIsLogsOpen(true)}
                className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                title="Activity Logs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              </button>
              <button
                onClick={handleJumpToToday}
                className="bg-slate-900 text-white text-[10px] font-bold px-4 py-2.5 rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest"
              >
                Today
              </button>
              {/* NEW Bulk Action Button */}
              <button
                onClick={() => {
                  setEditingRule(null); // Reset for new rule
                  setIsBulkModalOpen(true);
                }}
                className="bg-blue-600 text-white text-[10px] font-bold px-4 py-2.5 rounded-2xl hover:bg-blue-500 transition-all uppercase tracking-widest flex items-center gap-2"
              >
                <span>⚙️</span> Bulk Scheduler
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <div className="flex items-center justify-end gap-2">
                <p className={`text-[10px] font-bold uppercase ${isStale() ? 'text-orange-500' : 'text-slate-400'}`}>
                  Status: {isStale() ? 'Stale Data' : 'Connected'}
                </p>
                {/* 4. Manual Refresh Button */}
                <button
                  onClick={() => fetchData(viewedDate, false, true)}
                  className="hover:rotate-180 transition-transform duration-500 text-slate-400 hover:text-blue-600"
                  title="Force Sync"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                </button>
              </div>
              {/* 2. Last Sync Time */}
              <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                Sync: {formatSyncTime()}
              </p>
              <p className="text-xs font-bold text-slate-600">{email}</p>
            </div>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all">LOGOUT</button>
          </div>
        </header>

        {/* MAIN GRID */}
        <main className="flex-grow flex p-8 gap-8 overflow-hidden">
          {/* CALENDAR SECTION */}
          <div className="w-2/3 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">VillaPro Live Map</h2>
              <div className="flex gap-4">
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

          {/* SIDEBAR */}
          <div className="w-1/3 flex flex-col gap-6 overflow-hidden">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
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

              {(availability.full.includes(selectedDate.getDate()) || availability.noedit.includes(selectedDate.getDate()))
                && !snipingDates.includes(getDateStr(selectedDate)) // Check full string here
                && isFutureOrToday ? (
                <button
                  onClick={() => startSniper(selectedDate)}
                  className="w-full bg-red-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-500/40"
                >
                  🎯 Initialize Sniper
                </button>
              ) : snipingDates.includes(getDateStr(selectedDate)) ? (
                <button
                  onClick={() => stopSniper(selectedDate)}
                  className="w-full bg-slate-800 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700"
                >
                  🛑 Abort Mission
                </button>
              ) : (
                <button
                  onClick={() => handleAction(selectedDate)}
                  disabled={processingDate !== null || availability.noedit.includes(selectedDate.getDate())}
                  className="w-full bg-blue-600 py-4 rounded-2xl font-bold uppercase tracking-tighter hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  {processingDate ? "Processing..." : "Reserve / Delete"}
                </button>
              )}
            </div>

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
                        onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), res.day))}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                            {viewedDate.toLocaleString('en-US', { month: 'long' })} {res.day}
                          </p>
                          <p className="font-black text-slate-800">SPOT: {res.lot || '...'}</p>
                        </div>
                        <span className="text-[9px] font-black px-2 py-1 rounded-md uppercase bg-green-100 text-green-600 border border-green-200">
                          {globalPlate}
                        </span>
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
      </div>
    );
  }

  // --- LOGIN VIEW ---
  return (
    <div className="login-bg">
      <form onSubmit={handleLogin} className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-black text-center mb-2 tracking-tighter text-slate-900">PARK PRO</h2>
        <p className="text-center text-slate-400 text-xs font-bold uppercase mb-8 tracking-widest">VillaPro Dashboard</p>
        <input className="w-full p-5 mb-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="VillaPro Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full p-5 mb-8 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30">
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
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

export default App;