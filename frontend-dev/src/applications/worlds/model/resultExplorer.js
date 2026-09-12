import { getCircuitComponent, getCircuitNode, getCircuitBranch } from "./resultContext.js";
import { RESULT_MEASUREMENTS, RESULT_SCOPES, getSweepResponseSeries } from "./sweepResults.js";

function addSeries(series, key, label, quantity, unit, value, context) {
  if (value === undefined || value === null) return;
  series.push({ key, label, quantity, measurementType: quantity, unit, values: [{ value, failed: false, error: null }], ...context });
}
function normalizeVisualizationValue(value) {
  if (value === null || value === undefined) return { value: null, failed: true, error: "No result value was returned." };
  if (typeof value === "number" && !Number.isFinite(value)) return { value: null, failed: true, error: "Result value is not finite." };
  return { value, failed: false, error: null };
}
function getVisualizationPlots(result) { const visualization = result?.visualization; if (!visualization) return []; if (Array.isArray(visualization.plots)) return visualization.plots; if (Array.isArray(visualization.series)) return [visualization]; return []; }
function getPlotIndependentVariable(plot) { const axis = plot?.independent_variable ?? plot?.independentVariable ?? plot?.x; if (axis && Array.isArray(axis.values)) return axis; const firstSeries = Array.isArray(plot?.series) ? plot.series[0] : null; return { key: "independent", label: plot?.x_label ?? "X", unit: plot?.x_unit ?? "", values: Array.isArray(firstSeries?.x) ? firstSeries.x : [] }; }
export function getVisualizationSeries(result) {
  const series = [];
  for (const plot of getVisualizationPlots(result)) { const axis = getPlotIndependentVariable(plot); for (const item of Array.isArray(plot?.series) ? plot.series : []) { const quantity = item?.quantity ?? "measurement"; const source = String(item?.source ?? item?.id ?? "series"); const [sourceKind, ...sourceParts] = source.split(":"); const entityId = sourceParts.join(":") || item?.id || source; const entityType = ["node", "branch", "component"].includes(sourceKind) ? sourceKind : "series"; const yValues = Array.isArray(item?.y) ? item.y : []; series.push({ key: item?.id ?? `${plot?.id ?? "plot"}:${source}`, label: item?.label ?? source, quantity, measurementType: quantity, unit: item?.unit ?? "", values: yValues.map(normalizeVisualizationValue), xValues: Array.isArray(axis?.values) ? axis.values : [], xKey: axis?.key ?? "independent", xLabel: axis?.label ?? "X", xUnit: axis?.unit ?? "", plotId: plot?.id ?? null, plotTitle: plot?.title ?? "Simulation result", entityType, entityId, contextTitle: item?.label ?? entityId, contextDescription: source }); } }
  return series;
}
export function getOperatingPointResponseSeries(result) {
  const series = [];
  for (const [id, component] of Object.entries(result?.components ?? {})) { const context = getCircuitComponent(result, id); const name = context?.name ?? component?.name ?? id; const base = { entityType: "component", entityId: id, contextTitle: name, ports: context?.ports ?? {} }; addSeries(series, `component:${id}:voltage`, `V(${name})`, RESULT_MEASUREMENTS.VOLTAGE, "V", component?.voltage, { ...base, contextDescription: `Voltage across ${name}` }); addSeries(series, `component:${id}:current`, `I(${name})`, RESULT_MEASUREMENTS.CURRENT, "A", component?.current, { ...base, contextDescription: `Current through ${name}` }); addSeries(series, `component:${id}:power`, `P(${name})`, RESULT_MEASUREMENTS.POWER, "W", component?.power, { ...base, contextDescription: `Power of ${name}` }); }
  for (const [id, voltage] of Object.entries(result?.node_voltages ?? {})) { const node = getCircuitNode(result, id); addSeries(series, `node:${id}`, `V(${node?.is_ground ? "Ground" : node?.label ?? id})`, RESULT_MEASUREMENTS.VOLTAGE, "V", voltage, { entityType: "node", entityId: id, contextTitle: node?.is_ground ? "Ground" : node?.label ?? id, contextDescription: node?.is_ground ? "Reference node (0 V)" : `Voltage at ${node?.label ?? id}` }); }
  for (const [branchKey, current] of Object.entries(result?.branch_currents ?? {})) { const branch = getCircuitBranch(result, branchKey); addSeries(series, `branch:${branchKey}`, `I(${branch?.name ?? branchKey})`, RESULT_MEASUREMENTS.CURRENT, "A", current, { entityType: "branch", entityId: branchKey, contextTitle: branch?.name ?? branchKey, contextDescription: branch?.name ? `Current through ${branch.name}` : "Current through this branch", positiveNode: branch?.positive?.node, negativeNode: branch?.negative?.node, componentId: branch?.id ?? null }); }
  return series;
}
export function getResultSeries(result) { if (result?.visualization) { const visualizationSeries = getVisualizationSeries(result); if (visualizationSeries.length > 0) return visualizationSeries; } return result?.analysis === "dc_sweep" ? getSweepResponseSeries(result) : getOperatingPointResponseSeries(result); }
export function getExplorerMeasurements(scope, series) { const measurements = [RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER]; return measurements.filter(measurement => series.some(item => (scope === RESULT_SCOPES.NODES ? item.entityType === "node" : item.entityType === "component") && item.measurementType === measurement)); }
export function getExplorerSeries(series, scope, measurement) { return series.filter(item => (scope === RESULT_SCOPES.NODES ? item.entityType === "node" : item.entityType === "component") && item.measurementType === measurement); }
export function getCircuitSummaryRows(series) { const map = new Map(); for (const item of series) { if (!item.entityId || !item.entityType || item.entityType === "series") continue; const key = `${item.entityType}:${item.entityId}`; const row = map.get(key) ?? { key, entityType: item.entityType, entityId: item.entityId, label: item.contextTitle ?? item.label, values: {} }; row.values[item.measurementType] = item; map.set(key, row); } return [...map.values()]; }
export function getEntityMeasurementSeries(series, entityType, entityId, measurement) { return series.find(item => item.entityType === entityType && item.entityId === entityId && item.measurementType === measurement) ?? null; }
export function getProbeResultSeries(series, result, probe) {
  if (!probe?.measurement || !probe?.entityId) return null;
  const measurement = probe.measurement;
  if (probe.entityType === "component") return getEntityMeasurementSeries(series, "component", probe.nodeId ?? probe.entityId, measurement);
  if (probe.entityType !== "terminal") return getEntityMeasurementSeries(series, probe.entityType, probe.entityId, measurement);
  const separator = String(probe.entityId).indexOf(":");
  const componentId = separator >= 0 ? String(probe.entityId).slice(0, separator) : probe.nodeId;
  const portId = separator >= 0 ? String(probe.entityId).slice(separator + 1) : probe.terminalId;
  const component = getCircuitComponent(result, componentId);
  const port = component?.ports?.[portId];
  if (measurement === RESULT_MEASUREMENTS.VOLTAGE && port?.node) return getEntityMeasurementSeries(series, "node", port.node, measurement);
  return getEntityMeasurementSeries(series, "component", componentId, measurement) ?? Object.keys(result?.branch_currents ?? {}).map(key => [key, getCircuitBranch(result, key)]).find(([, branch]) => branch?.componentId === componentId || branch?.id === componentId)?.[0] ? getEntityMeasurementSeries(series, "branch", Object.keys(result.branch_currents).find(key => { const branch = getCircuitBranch(result, key); return branch?.componentId === componentId || branch?.id === componentId; }), measurement) : null;
}
export function getSummaryValue(series) { const values = Array.isArray(series?.values) ? series.values : []; for (let index = values.length - 1; index >= 0; index -= 1) { const point = values[index]; const value = Number(point?.value); if (!point?.failed && Number.isFinite(value)) return value; } return null; }
export function getMeasurementLabel(measurement) { return ({ [RESULT_MEASUREMENTS.VOLTAGE]: "V", [RESULT_MEASUREMENTS.CURRENT]: "I", [RESULT_MEASUREMENTS.POWER]: "P" })[measurement] ?? measurement; }
