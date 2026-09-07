import { useEffect, useMemo, useRef, useState } from "react";

import { serializeWorldGraph } from "../model/worldGraphSerializer";
import { createSimulationConfig, getSimulationConfigValidationError } from "../model/simulationConfig";
import { getSimulationStatus, getSimulationStatusLabel } from "../model/simulationState";
import SimulationSetup from "./SimulationSetup";

function formatVoltage(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} V` : "—";
}

function formatCurrent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Math.abs(number) >= 1 ? `${number.toFixed(2)} A` : `${(number * 1000).toFixed(1)} mA`;
}

function formatPower(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Math.abs(number) >= 1 ? `${number.toFixed(2)} W` : `${(number * 1000).toFixed(1)} mW`;
}

function getSimulationSignature(nodes, edges, config) {
  return JSON.stringify({
    circuit: {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        data: node.type === "world"
          ? {
              componentType: node.data?.componentType,
              definitionKey: node.data?.definitionKey,
              properties: node.data?.properties ?? {},
              ports: node.data?.ports ?? [],
            }
          : { portKind: node.data?.portKind },
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle,
      })),
    },
    simulation: config,
  });
}

export default function SimulationPanel({ nodes, edges, onSelectComponent }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simulationConfig, setSimulationConfig] = useState(() => createSimulationConfig());
  const [lastSimulationSignature, setLastSimulationSignature] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  const simulationSignature = useMemo(
    () => getSimulationSignature(nodes, edges, simulationConfig),
    [nodes, edges, simulationConfig]
  );

  const simulationIsStale = result !== null && lastSimulationSignature !== null && lastSimulationSignature !== simulationSignature;
  const voltageSources = useMemo(
    () => nodes
      .filter((node) => node.type === "world")
      .filter((node) => String(node.data?.componentType ?? "").toLowerCase().includes("voltage"))
      .map((node) => ({ id: node.id, label: node.data?.label ?? node.id })),
    [nodes]
  );
  const configurationError = getSimulationConfigValidationError(simulationConfig, voltageSources.map((source) => source.id));
  const status = getSimulationStatus({ result, running, error, simulationIsStale });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const updateSimulationConfig = (changes) => {
    setSimulationConfig((current) => ({
      ...current,
      ...changes,
      settings: { ...current.settings, ...(changes.settings ?? {}) },
    }));
  };

  const simulate = async () => {
    if (configurationError) {
      setError(configurationError);
      return;
    }
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRunning(true);
    setError(null);

    try {
      const payload = { ...serializeWorldGraph(nodes, edges), simulation: simulationConfig };
      const response = await fetch("/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok || !data.ok) throw new Error(data.error ?? `Simulation failed (${response.status})`);
      if (!mountedRef.current || abortControllerRef.current !== controller) return;

      const componentResults = Array.isArray(data.components)
        ? Object.fromEntries(data.components.map((component) => [component.id, component]))
        : data.components ?? {};

      setResult({ ...data, components: componentResults });
      setLastSimulationSignature(simulationSignature);
    } catch (simulationError) {
      if (simulationError?.name === "AbortError") return;
      if (!mountedRef.current) return;
      setResult(null);
      setLastSimulationSignature(null);
      setError(simulationError?.message ?? "Simulation failed");
    } finally {
      if (mountedRef.current && abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setRunning(false);
      }
    }
  };

  const selectComponent = (id) => {
    onSelectComponent?.(id);
    const element = document.querySelector(`.react-flow__node[data-id="${id}"]`);
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 0, clientY: 0 }));
  };

  const components = Object.entries(result?.components ?? {});
  const voltageSourcesInResult = components.filter(([, component]) => String(component.type ?? "").toLowerCase().includes("voltage"));
  const singleVoltageSource = voltageSourcesInResult.length === 1 ? voltageSourcesInResult[0][1] : null;
  const nodeVoltages = Object.entries(result?.node_voltages ?? {});
  const branchCurrents = Object.entries(result?.branch_currents ?? {});

  return (
    <section className="absolute bottom-0 right-0 top-0 z-10 flex w-[62%] min-w-0 flex-col border-l border-[#d9dde2] bg-[#f8f9f8]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#d9dde2] bg-white px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#58718f]">Simulation</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-base font-semibold text-[#17253a]">Electronics</div>
            <span className="rounded-full border border-[#e4e7eb] bg-[#fafbfc] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#69717b]">{getSimulationStatusLabel(status)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={simulate}
          disabled={running || Boolean(configurationError)}
          aria-busy={running}
          className="rounded-md border border-[#cfd5dc] bg-white px-4 py-2 text-xs font-medium text-[#26364d] shadow-sm transition hover:bg-[#f6f7f8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Running..." : simulationIsStale ? "Re-simulate" : "Simulate"}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-4 p-5 xl:grid-cols-[minmax(220px,0.38fr)_minmax(360px,1fr)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
              <div className="border-b border-[#e4e7eb] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Simulation Setup</div>
                <div className="mt-1 text-xs text-[#8a929c]">Choose the analysis and parameters for this run.</div>
              </div>
              <SimulationSetup config={simulationConfig} onChange={updateSimulationConfig} voltageSources={voltageSources} />
            </div>

            <div className="rounded-xl border border-[#d9dde2] bg-white px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Run status</div>
              <div className="mt-2 text-sm font-medium text-[#17253a]">{getSimulationStatusLabel(status)}</div>
              <div className="mt-1 text-xs leading-5 text-[#69717b]">
                {simulationIsStale
                  ? "The circuit or setup changed. Run the simulation again to refresh the results."
                  : result
                    ? "Results represent the latest completed simulation run."
                    : "Configure the analysis and run the simulation to generate results."}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {configurationError && (
              <div role="alert" aria-live="polite" className="rounded-xl border border-[#ead1d1] bg-[#fff8f8] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">Simulation setup error</div>
                <div className="mt-1 whitespace-pre-line text-xs leading-5 text-red-700">{configurationError}</div>
              </div>
            )}

            {simulationIsStale && (
              <div role="status" aria-live="polite" className="rounded-xl border border-[#eadfca] bg-[#fffaf0] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2f]">Simulation out of date</div>
                <div className="mt-1 text-xs leading-5 text-[#75613c]">The circuit or simulation setup has changed since these results were calculated.</div>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="assertive" className="rounded-xl border border-[#ead1d1] bg-white px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">Simulation error</div>
                <div className="mt-1 whitespace-pre-line text-xs leading-5 text-red-700">{error}</div>
              </div>
            )}

            {!result && !error && !configurationError && (
              <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-[#d9dde2] bg-white px-6 text-center">
                <div>
                  <div className="text-sm font-semibold text-[#17253a]">No simulation results yet</div>
                  <div className="mt-2 max-w-md text-xs leading-5 text-[#69717b]">Configure the analysis on the left, then run the simulation. Results, measurements and plots will live in this workspace.</div>
                </div>
              </div>
            )}

            {result && (
              <>
                <div role="region" aria-label="Simulation results" aria-live="polite" className="rounded-xl border border-[#d9dde2] bg-white">
                  <div className="border-b border-[#e4e7eb] px-4 py-4">
                    <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Circuit Summary</div>
                    {voltageSourcesInResult.length === 0 ? (
                      <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-xs text-[#69717b]">No voltage source detected.</div>
                    ) : voltageSourcesInResult.length > 1 ? (
                      <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5">
                        <div className="text-xs font-medium text-[#17253a]">Multiple voltage sources</div>
                        <div className="mt-1 text-[11px] leading-4 text-[#69717b]">{voltageSourcesInResult.length} sources are present in the circuit.</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {[["Supply", formatVoltage(singleVoltageSource.voltage)], ["Current", formatCurrent(singleVoltageSource.current)], ["Power", formatPower(singleVoltageSource.power)]].map(([label, value]) => (
                          <div key={label} className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5">
                            <div className="text-[9px] uppercase tracking-[0.1em] text-[#69717b]">{label}</div>
                            <div className="mt-1 font-mono text-sm font-semibold text-[#17253a]">{value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Components</div>
                      <div className="text-[10px] text-[#8a929c]">{components.length}</div>
                    </div>
                    {components.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#d9dde2] px-3 py-4 text-center text-xs text-[#69717b]">No component results returned.</div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-[#e4e7eb]">
                        {components.map(([id, component]) => {
                          const node = nodes.find((item) => item.id === id);
                          const name = node?.data?.label ?? component.name ?? id;
                          return (
                            <button key={id} type="button" onClick={() => selectComponent(id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-[#e4e7eb] bg-white px-3 py-2.5 text-left last:border-b-0 hover:bg-[#fafbfc]">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-medium text-[#17253a]">{name}</div>
                                <div className="mt-0.5 text-[9px] uppercase tracking-[0.08em] text-[#8a929c]">{component.type ?? "Component"}</div>
                              </div>
                              <span className="font-mono text-[10px] text-[#26364d]">{formatVoltage(component.voltage)}</span>
                              <span className="font-mono text-[10px] text-[#26364d]">{formatCurrent(component.current)}</span>
                              <span className="font-mono text-[10px] text-[#26364d]">{formatPower(component.power)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#e4e7eb] px-4 py-4">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Nodes</div>
                    {nodeVoltages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#d9dde2] px-3 py-3 text-xs text-[#69717b]">No node voltage results returned.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {nodeVoltages.map(([node, voltage], index) => (
                          <div key={node} className="flex items-center justify-between text-xs">
                            <span className="text-[#58718f]">{node === "ground" ? "Ground" : `Node ${index}`}</span>
                            <span className="font-mono font-medium text-[#17253a]">{formatVoltage(voltage)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white">
                  <button type="button" onClick={() => setShowAdvanced((current) => !current)} aria-expanded={showAdvanced} className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#fafbfc]">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Advanced details</span>
                    <span aria-hidden="true" className="text-xs text-[#69717b]">{showAdvanced ? "−" : "+"}</span>
                  </button>
                  {showAdvanced && (
                    <div className="border-t border-[#e4e7eb] px-4 py-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Branch Currents</div>
                      {branchCurrents.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#d9dde2] px-3 py-3 text-xs text-[#69717b]">No branch current results returned.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {branchCurrents.map(([branch, current]) => (
                            <div key={branch} className="flex items-center justify-between text-xs">
                              <span className="text-[#58718f]">{branch}</span>
                              <span className="font-mono font-medium text-[#17253a]">{formatCurrent(current)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
