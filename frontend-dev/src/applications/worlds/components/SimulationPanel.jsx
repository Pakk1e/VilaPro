import { useEffect, useMemo, useRef, useState } from "react";

import { serializeWorldGraph } from "../model/worldGraphSerializer";
import { createSimulationConfig, getSimulationConfigValidationError, getSimulationModeLabel, SIMULATION_MODES } from "../model/simulationConfig";
import { buildLiveSimulationRequest, buildSimulationRequest, normalizeLiveSnapshot, normalizeSimulationResponse } from "../model/simulationTransport";
import { getSimulationStatus, getSimulationStatusLabel } from "../model/simulationState";
import SimulationSetup from "./SimulationSetup";
import ResultExplorer from "./ResultExplorer";
import LiveSimulationView from "./LiveSimulationView";

function getSimulationSignature(nodes, edges, config) {
  return JSON.stringify({
    circuit: {
      nodes: nodes.map((node) => ({ id: node.id, type: node.type, data: node.type === "world" ? { componentType: node.data?.componentType, definitionKey: node.data?.definitionKey, properties: node.data?.properties ?? {}, ports: node.data?.ports ?? [] } : { portKind: node.data?.portKind } })),
      edges: edges.map((edge) => ({ id: edge.id, source: edge.source, sourceHandle: edge.sourceHandle, target: edge.target, targetHandle: edge.targetHandle })),
    },
    simulation: config,
  });
}

export default function SimulationPanel({ nodes, edges, sweepTargets = [] }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [liveHistory, setLiveHistory] = useState([]);
  const [simulationConfig, setSimulationConfig] = useState(() => createSimulationConfig());
  const [lastSimulationSignature, setLastSimulationSignature] = useState(null);
  const abortControllerRef = useRef(null);
  const liveStreamRef = useRef(null);
  const mountedRef = useRef(true);
  const simulationSignature = useMemo(() => getSimulationSignature(nodes, edges, simulationConfig), [nodes, edges, simulationConfig]);
  const simulationIsStale = result !== null && lastSimulationSignature !== null && lastSimulationSignature !== simulationSignature;
  const configurationError = getSimulationConfigValidationError(simulationConfig, sweepTargets);
  const status = getSimulationStatus({ result, running, error, simulationIsStale });

  const appendLiveSnapshot = (snapshot) => setLiveHistory((current) => [...current, snapshot].slice(-240));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      liveStreamRef.current?.close();
      liveStreamRef.current = null;
    };
  }, []);

  const updateSimulationConfig = (changes) => {
    setSimulationConfig((current) => ({ ...current, ...changes, settings: { ...current.settings, ...(changes.settings ?? {}) } }));
    if (changes.mode && changes.mode !== SIMULATION_MODES.LIVE) {
      liveStreamRef.current?.close();
      liveStreamRef.current = null;
      setLiveSnapshot(null);
      setLiveHistory([]);
    }
  };

  const liveRequest = async (path, method = "POST") => {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" } });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error ?? `Live simulation request failed (${response.status})`);
    return normalizeLiveSnapshot(data);
  };

  const openLiveStream = (sessionId) => {
    if (!mountedRef.current || !sessionId) return;
    liveStreamRef.current?.close();
    const stream = new EventSource(`/simulate/live/${sessionId}/stream`);
    liveStreamRef.current = stream;
    stream.onmessage = (event) => {
      try {
        const snapshot = normalizeLiveSnapshot(JSON.parse(event.data));
        if (!mountedRef.current) return;
        setLiveSnapshot(snapshot);
        appendLiveSnapshot(snapshot);
        setRunning(snapshot.status === "running");
        if (["completed", "cancelled", "failed"].includes(snapshot.status)) stream.close();
      } catch (streamError) {
        if (mountedRef.current) setError(streamError?.message ?? "Invalid live simulation update");
      }
    };
    stream.onerror = () => {
      if (!mountedRef.current || stream.readyState !== EventSource.CLOSED) return;
      setRunning(false);
      setError("Live simulation update stream closed unexpectedly");
    };
  };

  const startLive = async () => {
    if (configurationError) { setError(configurationError); return; }
    setError(null); setResult(null); setLastSimulationSignature(null); setLiveHistory([]);
    liveStreamRef.current?.close(); liveStreamRef.current = null;
    try {
      const payload = buildLiveSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph);
      const response = await fetch("/simulate/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? `Live simulation failed (${response.status})`);
      if (!mountedRef.current) return;
      const snapshot = normalizeLiveSnapshot(data);
      setLiveSnapshot(snapshot); appendLiveSnapshot(snapshot); setRunning(snapshot.status === "running");
      if (snapshot.status === "running") openLiveStream(snapshot.session_id);
    } catch (liveError) {
      if (!mountedRef.current) return;
      setRunning(false); setLiveSnapshot(null); setLiveHistory([]); setError(liveError?.message ?? "Live simulation failed");
    }
  };

  const simulate = async () => {
    if (simulationConfig.mode === SIMULATION_MODES.LIVE) { await startLive(); return; }
    if (configurationError) { setError(configurationError); return; }
    abortControllerRef.current?.abort();
    const controller = new AbortController(); abortControllerRef.current = controller;
    setRunning(true); setError(null); setLiveSnapshot(null); setLiveHistory([]);
    try {
      const payload = buildSimulationRequest(nodes, edges, simulationConfig, serializeWorldGraph);
      const response = await fetch("/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? `Simulation failed (${response.status})`);
      if (!mountedRef.current || abortControllerRef.current !== controller) return;
      setResult(normalizeSimulationResponse(data)); setLastSimulationSignature(simulationSignature);
    } catch (simulationError) {
      if (simulationError?.name === "AbortError") return;
      if (!mountedRef.current) return;
      setResult(null); setLastSimulationSignature(null); setError(simulationError?.message ?? "Simulation failed");
    } finally {
      if (mountedRef.current && abortControllerRef.current === controller) { abortControllerRef.current = null; setRunning(false); }
    }
  };

  const pauseLive = async () => {
    if (!liveSnapshot?.session_id) return;
    try { const snapshot = await liveRequest(`/simulate/live/${liveSnapshot.session_id}/pause`); setLiveSnapshot(snapshot); appendLiveSnapshot(snapshot); setRunning(false); }
    catch (liveError) { setError(liveError?.message ?? "Unable to pause live simulation"); }
  };

  const resumeLive = async () => {
    if (!liveSnapshot?.session_id) return;
    try { const snapshot = await liveRequest(`/simulate/live/${liveSnapshot.session_id}/resume`); setLiveSnapshot(snapshot); appendLiveSnapshot(snapshot); setRunning(snapshot.status === "running"); }
    catch (liveError) { setError(liveError?.message ?? "Unable to resume live simulation"); }
  };

  const stopLive = async () => {
    if (!liveSnapshot?.session_id) return;
    try { const snapshot = await liveRequest(`/simulate/live/${liveSnapshot.session_id}/cancel`); setLiveSnapshot(snapshot); appendLiveSnapshot(snapshot); setRunning(false); liveStreamRef.current?.close(); liveStreamRef.current = null; }
    catch (liveError) { setError(liveError?.message ?? "Unable to stop live simulation"); }
  };

  return (
    <section className="absolute bottom-0 right-0 top-0 z-10 flex w-[62%] min-w-0 flex-col border-l border-[#d9dde2] bg-[#f8f9f8]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#d9dde2] bg-white px-5 py-4">
        <div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#58718f]">Simulation</div><div className="mt-1 flex items-center gap-2"><div className="text-base font-semibold text-[#17253a]">Electronics</div><span className="rounded-full border border-[#e4e7eb] bg-[#fafbfc] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#69717b]">{simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot ? liveSnapshot.status : getSimulationStatusLabel(status)}</span></div></div>
        <div className="flex items-center gap-2">
          {simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot?.status === "running" && <button type="button" onClick={pauseLive} className="rounded-md border border-[#cfd5dc] bg-white px-3 py-2 text-xs font-medium text-[#26364d] shadow-sm hover:bg-[#f6f7f8]">Pause</button>}
          {simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot?.status === "paused" && <button type="button" onClick={resumeLive} className="rounded-md border border-[#cfd5dc] bg-white px-3 py-2 text-xs font-medium text-[#26364d] shadow-sm hover:bg-[#f6f7f8]">Resume</button>}
          {simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot && !["completed", "cancelled", "failed"].includes(liveSnapshot.status) && <button type="button" onClick={stopLive} className="rounded-md border border-[#ead1d1] bg-white px-3 py-2 text-xs font-medium text-red-700 shadow-sm hover:bg-[#fff8f8]">Stop</button>}
          <button type="button" onClick={simulate} disabled={Boolean(configurationError) || (simulationConfig.mode === SIMULATION_MODES.STATIC && running)} aria-busy={running} className="rounded-md border border-[#cfd5dc] bg-white px-4 py-2 text-xs font-medium text-[#26364d] shadow-sm transition hover:bg-[#f6f7f8] disabled:cursor-not-allowed disabled:opacity-50">{simulationConfig.mode === SIMULATION_MODES.LIVE ? (liveSnapshot ? "Restart Live" : "Start Live") : (running ? "Running..." : simulationIsStale ? "Re-simulate" : "Simulate")}</button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid gap-4 p-5 xl:grid-cols-[minmax(220px,0.38fr)_minmax(360px,1fr)]"><div className="space-y-4"><div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white"><div className="border-b border-[#e4e7eb] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Execution</div><div className="mt-1 text-xs text-[#8a929c]">Choose how the simulation executes.</div></div><div className="grid grid-cols-2 gap-2 p-4">{Object.values(SIMULATION_MODES).map((mode) => <button key={mode} type="button" onClick={() => updateSimulationConfig({ mode })} className={`rounded-md border px-3 py-2 text-xs font-medium ${simulationConfig.mode === mode ? "border-[#58718f] bg-[#f1f5f9] text-[#17253a]" : "border-[#d9dde2] bg-white text-[#69717b]"}`}>{getSimulationModeLabel(mode)}</button>)}</div></div><div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white"><div className="border-b border-[#e4e7eb] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Simulation Setup</div><div className="mt-1 text-xs text-[#8a929c]">Choose the analysis and parameters for this run.</div></div><SimulationSetup config={simulationConfig} onChange={updateSimulationConfig} sweepTargets={sweepTargets} /></div><div className="rounded-xl border border-[#d9dde2] bg-white px-4 py-4"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Run status</div><div className="mt-2 text-sm font-medium text-[#17253a]">{simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot ? liveSnapshot.status : getSimulationStatusLabel(status)}</div><div className="mt-1 text-xs leading-5 text-[#69717b]">{simulationConfig.mode === SIMULATION_MODES.LIVE ? "Live mode keeps a session open and updates the current sampled state." : simulationIsStale ? "The circuit or setup changed. Run the simulation again to refresh the results." : result ? "Results represent the latest completed simulation run." : "Configure the analysis and run the simulation to generate results."}</div></div></div><div className="min-w-0 space-y-4">{configurationError && <div role="alert" className="rounded-xl border border-[#ead1d1] bg-[#fff8f8] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">Simulation setup error</div><div className="mt-1 whitespace-pre-line text-xs leading-5 text-red-700">{configurationError}</div></div>}{error && <div role="alert" className="rounded-xl border border-[#ead1d1] bg-white px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">Simulation error</div><div className="mt-1 whitespace-pre-line text-xs leading-5 text-red-700">{error}</div></div>}{simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot?.error && <div role="alert" className="rounded-xl border border-[#ead1d1] bg-white px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">Live simulation error</div><div className="mt-1 whitespace-pre-line text-xs leading-5 text-red-700">{liveSnapshot.error}</div></div>}{simulationConfig.mode === SIMULATION_MODES.LIVE && liveSnapshot && <LiveSimulationView snapshot={liveSnapshot} history={liveHistory} />}{simulationConfig.mode === SIMULATION_MODES.STATIC && !result && !error && !configurationError && <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-[#d9dde2] bg-white px-6 text-center"><div><div className="text-sm font-semibold text-[#17253a]">No simulation results yet</div><div className="mt-2 max-w-md text-xs leading-5 text-[#69717b]">Configure the analysis and run the simulation. Results, measurements and plots will live in this workspace.</div></div></div>}{simulationConfig.mode === SIMULATION_MODES.STATIC && result && <ResultExplorer result={result} />}</div></div></div>
    </section>
  );
}
