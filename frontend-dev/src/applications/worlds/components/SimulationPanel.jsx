import { useEffect, useMemo, useRef, useState } from "react";

import { serializeWorldGraph } from "../model/worldGraphSerializer";
import {
  getSimulationStatus,
  getSimulationStatusLabel,
} from "../model/simulationState";

function formatVoltage(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} V` : "—";
}

function formatCurrent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Math.abs(number) >= 1
    ? `${number.toFixed(2)} A`
    : `${(number * 1000).toFixed(1)} mA`;
}

function formatPower(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Math.abs(number) >= 1
    ? `${number.toFixed(2)} W`
    : `${(number * 1000).toFixed(1)} mW`;
}

function getGraphSignature(nodes, edges) {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      data:
        node.type === "world"
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
  });
}

export default function SimulationPanel({ nodes, edges, onSelectComponent }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [lastSimulationSignature, setLastSimulationSignature] = useState(null);
  const abortControllerRef = useRef(null);
  const mountedRef = useRef(true);

  const graphSignature = useMemo(
    () => getGraphSignature(nodes, edges),
    [nodes, edges]
  );

  const simulationIsStale =
    result !== null &&
    lastSimulationSignature !== null &&
    lastSimulationSignature !== graphSignature;

  const status = getSimulationStatus({
    result,
    running,
    error,
    simulationIsStale,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const simulate = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setRunning(true);
    setError(null);

    try {
      const payload = serializeWorldGraph(nodes, edges);
      const response = await fetch("/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? `Simulation failed (${response.status})`);
      }

      if (!mountedRef.current || abortControllerRef.current !== controller) return;
      setResult(data);
      setLastSimulationSignature(graphSignature);
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
    element?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 0, clientY: 0 })
    );
  };

  const components = Object.entries(result?.components ?? {});
  const voltageSources = components.filter(([, component]) =>
    String(component.type ?? "").toLowerCase().includes("voltage")
  );
  const singleVoltageSource = voltageSources.length === 1 ? voltageSources[0][1] : null;
  const nodeVoltages = Object.entries(result?.node_voltages ?? {});
  const branchCurrents = Object.entries(result?.branch_currents ?? {});

  return (
    <div className="absolute left-4 top-4 z-10 w-[360px]">
      <div className="overflow-hidden rounded-xl border border-[#d9dde2] bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-[#e4e7eb] px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#58718f]">
              Simulation
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-sm font-semibold text-[#17253a]">Electronics</div>
              <span className="rounded-full border border-[#e4e7eb] bg-[#fafbfc] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[#69717b]">
                {getSimulationStatusLabel(status)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={simulate}
              disabled={running}
              aria-busy={running}
              className="rounded-md border border-[#cfd5dc] bg-white px-3 py-1.5 text-xs font-medium text-[#26364d] shadow-sm transition hover:bg-[#f6f7f8] disabled:cursor-wait disabled:opacity-50"
            >
              {running ? "Running..." : simulationIsStale ? "Re-simulate" : "Simulate"}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand simulation panel" : "Collapse simulation panel"}
              className="rounded-md border border-[#e4e7eb] px-2 py-1.5 text-xs text-[#69717b] hover:bg-[#fafbfc]"
            >
              {collapsed ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {!collapsed && (
          <>
            {!result && !error && (
              <div className="px-4 py-4 text-xs leading-5 text-[#69717b]">
                Build the circuit, then run a simulation to calculate node voltages, branch currents, and component values.
              </div>
            )}

            {simulationIsStale && (
              <div role="status" aria-live="polite" className="border-b border-[#e4e7eb] bg-[#fffaf0] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2f]">Simulation out of date</div>
                <div className="mt-1 text-xs leading-5 text-[#75613c]">
                  The circuit has changed since these results were calculated. Run the simulation again to refresh the values.
                </div>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="assertive" className="border-b border-[#e4e7eb] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">Simulation error</div>
                <div className="mt-1 whitespace-pre-line text-xs leading-5 text-red-700">{error}</div>
              </div>
            )}

            {result && (
              <div role="region" aria-label="Simulation results" aria-live="polite" className="max-h-[45vh] overflow-y-auto">
                <div className="border-b border-[#e4e7eb] px-4 py-4">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">Circuit Summary</div>
                  {voltageSources.length === 0 ? (
                    <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5 text-xs text-[#69717b]">No voltage source detected.</div>
                  ) : voltageSources.length > 1 ? (
                    <div className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-3 py-2.5">
                      <div className="text-xs font-medium text-[#17253a]">Multiple voltage sources</div>
                      <div className="mt-1 text-[11px] leading-4 text-[#69717b]">{voltageSources.length} sources are present in the circuit.</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["Supply", formatVoltage(singleVoltageSource.voltage)],
                        ["Current", formatCurrent(singleVoltageSource.current)],
                        ["Power", formatPower(singleVoltageSource.power)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-[#e4e7eb] bg-[#fafbfc] px-2.5 py-2">
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
                          <button
                            key={id}
                            type="button"
                            onClick={() => selectComponent(id)}
                            className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-2 border-b border-[#e4e7eb] bg-white px-3 py-2.5 text-left last:border-b-0 hover:bg-[#fafbfc]"
                          >
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

                <div className="border-t border-[#e4e7eb]">
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
                            <div key={branch} className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate text-[#58718f]">{branch}</span>
                              <span className="shrink-0 font-mono font-medium text-[#17253a]">{formatCurrent(current)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
