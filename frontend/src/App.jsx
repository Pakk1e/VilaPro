import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const HOST_IP = window.location.hostname;
const API_BASE_URL = `http://${HOST_IP}:5000`;

// --- LEGEND COMPONENT (Defined outside to prevent re-renders) ---
const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
    <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
  </div>
);

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [lockedDays, setLockedDays] = useState([]); // Added this to prevent crash
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [globalPlate, setGlobalPlate] = useState('BL123XX');
  const [loading, setLoading] = useState(false);
  const [processingDate, setProcessingDate] = useState(null);

  const fetchData = async (targetDate = selectedDate) => {
    if (!email) return;
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    try {
      const availResponse = await fetch(`${API_BASE_URL}/api/availability?month=${month}&year=${year}`);
      if (availResponse.ok) {
        const data = await availResponse.json();
        setAvailability(data.full_days || []);
        setLockedDays(data.locked_days || []); // Sync locked days
      }

      const resResponse = await fetch(`${API_BASE_URL}/api/reservations`);
      if (resResponse.ok) {
        const resData = await resResponse.json();
        setReservations(Array.isArray(resData) ? resData : []);
      }
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

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
      if (data.status === 'success') {
        setIsLoggedIn(true);
        // fetchData will be triggered by the useEffect
      } else {
        alert("VillaPro Authentication Failed.");
      }
    } catch (error) {
      alert("Backend unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (dateObj) => {
    const dayNum = dateObj.getDate();
    // Safety: Don't allow clicking locked days
    if (lockedDays.includes(dayNum)) {
        alert("This date is locked by VillaPro.");
        return;
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const existingRes = reservations.find(r => r.date === dateStr);
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
      if (result.success) {
        await fetchData();
      } else {
        alert(`VillaPro Message: ${result.message || "Action rejected"}`);
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setProcessingDate(null);
    }
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayNumber = date.getDate();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // 1. Past days
    if (dateStr < todayStr) return 'vp-unavailable';

    // 2. Locked days (Grey)
    if (lockedDays.includes(dayNumber)) return 'vp-unavailable';

    // 3. Processing
    if (processingDate === dayNumber) return 'vp-processing';

    // 4. Reservations (Blue)
    const myRes = reservations.find(r => r.date === dateStr);
    if (myRes) {
      if (myRes.status === 'Reserved' || !isNaN(myRes.status)) return 'vp-my-spot';
      if (myRes.status === 'Pending') return 'vp-pending';
      return 'vp-sniper-active';
    }

    // 5. Full (Red)
    if (availability.includes(dayNumber)) return 'vp-full';

    // 6. Default (Green)
    return 'vp-free';
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const interval = setInterval(() => fetchData(), 60000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  if (isLoggedIn) {
    return (
      <div className="dashboard-container">
        <header className="h-24 bg-white border-b border-slate-200 px-10 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter">PARK <span className="text-blue-600">PRO</span></h1>
            <div className="flex items-center bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 mr-3 uppercase">Active Plate:</span>
              <input
                className="bg-transparent border-none outline-none font-black text-blue-600 w-24"
                value={globalPlate}
                onChange={(e) => setGlobalPlate(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status: Connected</p>
              <p className="text-xs font-bold text-slate-600">{email}</p>
            </div>
            <button onClick={() => window.location.reload()} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all">LOGOUT</button>
          </div>
        </header>

        <main className="flex-grow flex p-8 gap-8 overflow-hidden">
          <div className="w-2/3 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">VillaPro Live Map</h2>
              <div className="flex gap-4">
                <LegendItem color="bg-green-500" label="Free" />
                <LegendItem color="bg-red-500" label="Full" />
                <LegendItem color="bg-blue-600" label="Your Spot" />
                <LegendItem color="bg-orange-500" label="Sniping" />
              </div>
            </div>
            <div className="flex-grow">
              <Calendar
                onChange={setSelectedDate}
                onClickDay={(date) => handleAction(date)}
                onActiveStartDateChange={({ activeStartDate }) => fetchData(activeStartDate)}
                value={selectedDate}
                tileClassName={getTileClassName}
                className="main-dashboard-calendar"
              />
            </div>
          </div>

          <div className="w-1/3 flex flex-col gap-6 overflow-hidden">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
              <p className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-1">Selection</p>
              <p className="text-2xl font-black mb-4">{selectedDate.toDateString()}</p>
              <button
                onClick={() => handleAction(selectedDate)}
                disabled={processingDate !== null}
                className="w-full bg-blue-600 py-4 rounded-2xl font-bold uppercase tracking-tighter hover:bg-blue-500 transition-all disabled:opacity-50"
              >
                {processingDate ? "Processing..." : "Reserve / Delete"}
              </button>
            </div>

            <div className="flex-grow bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 font-bold text-slate-800">Your Reservations</div>
              <div className="flex-grow overflow-y-auto p-4 space-y-3">
                {reservations.map(res => (
                  <div key={res.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">{res.date}</p>
                      <p className="font-black text-slate-800">{res.plate_number}</p>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase 
                      ${res.status === 'Reserved' || !isNaN(res.status) ? 'bg-green-100 text-green-600' :
                        res.status === 'Pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="login-bg">
      <form onSubmit={handleLogin} className="bg-white p-12 rounded-[3rem] shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-black text-center mb-8 tracking-tighter text-slate-900">PARK PRO</h2>
        <input className="w-full p-5 mb-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full p-5 mb-8 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30">
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default App;