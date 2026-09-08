import { getCircuitComponent, getCircuitNode, getCircuitBranch } from "./resultContext.js";
import { RESULT_MEASUREMENTS, RESULT_SCOPES, getSweepResponseSeries } from "./sweepResults.js";

function addSeries(series, key, label, quantity, unit, value, context) {
  if (value === undefined || value === null) return;
  series.push({ key, label, quantity, measurementType: quantity, unit, values: [{ value, failed: false, error: null }], ...context });
}

export function getOperatingPointResponseSeries(result) {
  const series = [];
  for (const [id, component] of Object.entries(result?.components ?? {})) {
    const context = getCircuitComponent(result, id);
    const name = context?.name ?? component?.name ?? id;
    const base = { entityType: "component", entityId: id, contextTitle: name, ports: context?.ports ?? {} };
    addSeries(series, `component:${id}:voltage`, `V(${name})`, RESULT_MEASUREMENTS.VOLTAGE, "V", component?.voltage, { ...base, contextDescription: `Voltage across ${name}` });
    addSeries(series, `component:${id}:current`, `I(${name})`, RESULT_MEASUREMENTS.CURRENT, "A", component?.current, { ...base, contextDescription: `Current through ${name}` });
    addSeries(series, `component:${id}:power`, `P(${name})`, RESULT_MEASUREMENTS.POWER, "W", component?.power, { ...base, contextDescription: `Power of ${name}` });
  }
  for (const [id, voltage] of Object.entries(result?.node_voltages ?? {})) {
    const node = getCircuitNode(result, id);
    addSeries(series, `node:${id}`, `V(${node?.is_ground ? "Ground" : node?.label ?? id})`, RESULT_MEASUREMENTS.VOLTAGE, "V", voltage, {
      entityType: "node", entityId: id, contextTitle: node?.is_ground ? "Ground" : node?.label ?? id,
      contextDescription: node?.is_ground ? "Reference node (0 V)" : `Voltage at ${node?.label ?? id}`,
    });
  }
  for (const [branchKey, current] of Object.entries(result?.branch_currents ?? {})) {
    const branch = getCircuitBranch(result, branchKey);
    addSeries(series, `branch:${branchKey}`, `I(${branch?.name ?? branchKey})`, RESULT_MEASUREMENTS.CURRENT, "A", current, {
      entityType: "branch", entityId: branchKey, contextTitle: branch?.name ?? branchKey,
      contextDescription: branch?.name ? `Current through ${branch.name}` : "Current through this branch",
      positiveNode: branch?.positive?.node, negativeNode: branch?.negative?.node, componentId: branch?.id ?? null,
    });
  }
  return series;
}

export function getResultSeries(result) {
  return result?.analysis === "dc_sweep" ? getSweepResponseSeries(result) : getOperatingPointResponseSeries(result);
}

function matchesScope(item, scope) {
  return scope === RESULT_SCOPES.NODES ? item.entityType === "node" : item.entityType === "component";
}

// Compatibility helpers retained for the existing explorer component/tests.
export function getExplorerMeasurements(scope, series) {
  const measurements = [RESULT_MEASUREMENTS.VOLTAGE, RESULT_MEASUREMENTS.CURRENT, RESULT_MEASUREMENTS.POWER];
  return measurements.filter((measurement) => series.some((item) => matchesScope(item, scope) && item.measurementType === measurement));
}

export function getExplorerSeries(series, scope, measurement) {
  return series.filter((item) => matchesScope(item, scope) && item.measurementType === measurement);
}

export function getCircuitSummaryRows(series) {
  const map = new Map();
  for (const item of series) {
    if (!item.entityId || !item.entityType || item.entityType === "branch") continue;
    const key = `${item.entityType}:${item.entityId}`;
    const row = map.get(key) ?? { key, entityType: item.entityType, entityId: item.entityId, label: item.contextTitle ?? item.label, values: {} };
    row.values[item.measurementType] = item;
    map.set(key, row);
  }
  return [...map.values()];
}

export function getEntityMeasurementSeries(series, entityType, entityId, measurement) {
  return series.find((item) => item.entityType === entityType && item.entityId === entityId && item.measurementType === measurement) ?? null;
}

/** Return the latest successful value in a result series for summary display. */
export function getSummaryValue(series) {
  const values = Array.isArray(series?.values) ? series.values : [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const point = values[index];
    const value = Number(point?.value);
    if (!point?.failed && Number.isFinite(value)) return value;
  }
  return null;
}

export function getMeasurementLabel(measurement) {
  return ({
    [RESULT_MEASUREMENTS.VOLTAGE]: "V",
    [RESULT_MEASUREMENTS.CURRENT]: "I",
    [RESULT_MEASUREMENTS.POWER]: "P",
  })[measurement] ?? measurement;
}
