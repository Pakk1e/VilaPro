{/* HEADER */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 w-full">
          <div className="flex items-center gap-8">
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tighter">PARK <span className="text-blue-600">PRO</span></h1>
            {/* MOBILE: OPEN SIDEBAR BUTTON */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
              More
            </button>

            {/* DESKTOP CONTROLS */}
            <div className="hidden lg:flex items-center gap-3">

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 mr-3 uppercase">Active Plate:</span>
                  <input
                    className="bg-transparent border-none outline-none font-black text-blue-600 w-24"
                    value={globalPlate}
                    onChange={(e) => setGlobalPlate(e.target.value.toUpperCase())}
                  />
                </div>
                {/* 1. Activity Logs Button */}
                <button
                  onClick={() => setIsLogsOpen(true)}
                  className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                  title="Activity Logs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                </button>
                {/* 2. Jump to Today Button */}
                <button
                  onClick={handleJumpToToday}
                  className="bg-slate-900 text-white text-[10px] font-bold px-4 py-2.5 rounded-2xl hover:bg-slate-800 transition-all uppercase tracking-widest"
                >
                  Today
                </button>
                {/* 3. Bulk Action Button */}
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
              {/* 5. Last Sync Time */}
              <p className="text-[9px] font-medium text-slate-400 mt-0.5">
                Sync: {formatSyncTime()}
              </p>
              <p className="text-xs font-bold text-slate-600">{email}</p>
            </div>
            <button onClick={handleLogout} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all">LOGOUT</button>
          </div>
        </header>