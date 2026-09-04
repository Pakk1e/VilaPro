import { useState } from "react";

import { serializeWorldGraph } from "../model/worldGraphSerializer";

export default function SimulationPanel({
  nodes,
  edges,
}) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const simulate = async () => {
    setRunning(true);
    setError(null);

    try {
      const payload = serializeWorldGraph(
        nodes,
        edges
      );

      const response = await fetch(
        "/simulate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error ??
            `Simulation failed (${response.status})`
        );
      }

      setResult(data);
    } catch (simulationError) {
      setResult(null);
      setError(
        simulationError?.message ??
          "Simulation failed"
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="absolute left-4 top-4 z-10 w-[300px]">
      <div className="rounded-xl border border-[#d9dde2] bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-[#e4e7eb] px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#58718f]">
              Simulation
            </div>

            <div className="mt-1 text-sm font-semibold text-[#17253a]">
              Electronics
            </div>
          </div>

          <button
            type="button"
            onClick={simulate}
            disabled={running}
            className="rounded-md border border-[#cfd5dc] bg-white px-3 py-1.5 text-xs font-medium text-[#26364d] shadow-sm transition hover:bg-[#f6f7f8] disabled:cursor-wait disabled:opacity-50"
          >
            {running
              ? "Running..."
              : "Simulate"}
          </button>
        </div>

        {error && (
          <div className="border-b border-[#e4e7eb] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600">
              Error
            </div>

            <div className="mt-1 text-xs leading-5 text-red-700">
              {error}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 px-4 py-4">
            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
                Node Voltages
              </div>

              <div className="space-y-1.5">
                {Object.entries(
                  result.node_voltages ?? {}
                ).map(
                  ([node, voltage]) => (
                    <div
                      key={node}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-[#58718f]">
                        {node}
                      </span>

                      <span className="font-mono font-medium text-[#17253a]">
                        {Number(voltage).toFixed(4)} V
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="border-t border-[#e4e7eb] pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69717b]">
                Branch Currents
              </div>

              <div className="space-y-1.5">
                {Object.entries(
                  result.branch_currents ?? {}
                ).map(
                  ([branch, current]) => (
                    <div
                      key={branch}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-mono text-[#58718f]">
                        {branch}
                      </span>

                      <span className="font-mono font-medium text-[#17253a]">
                        {Number(current).toFixed(6)} A
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
