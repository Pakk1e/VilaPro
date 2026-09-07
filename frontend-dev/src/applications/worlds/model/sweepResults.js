export function getDataset(result, name) {
  const datasets = Array.isArray(result?.result?.datasets) ? result.result.datasets : [];
  return datasets.find((dataset) => dataset?.name === name) ?? null;
}

export function getSweepValues(result) {
  const dataset = getDataset(result, "sweep");
  return Array.isArray(dataset?.values) ? dataset.values : [];
}

export function getSweepPointStatuses(result) {
  const values = getDataset(result, "sweep_status")?.values;
  const sweepValues = getSweepValues(result);
  if (!Array.isArray(values)) return sweepValues.map(() => ({ status: "completed" }));
  return sweepValues.map((_, index) => values[index] ?? { status: "failed", error: "No result status was returned." });
}

export function getSweepInformation(result) {
  const information = result?.result?.analysis_information;
  const settings = information?.settings;
  if (!information || information.analysis !== "dc_sweep" || !settings) return null;

  return {
    source: information.sweep?.source ?? settings.source ?? "",
    parameter: information.sweep?.parameter ?? settings.parameter ?? "V",
    start: settings.start,
    stop: settings.stop,
    step: settings.step,
  };
}

export function getComponentSweepRows(result) {
  const sweepValues = getSweepValues(result);
  const dataset = getDataset(result, "components");
  const snapshots = Array.isArray(dataset?.values) ? dataset.values : [];
  const statuses = getSweepPointStatuses(result);

  return sweepValues.map((sweepValue, index) => ({
    sweepValue,
    components: Array.isArray(snapshots[index]) ? snapshots[index] : [],
    failed: statuses[index]?.status === "failed" || !Array.isArray(snapshots[index]),
    error: statuses[index]?.error ?? null,
  }));
}

export function getSweepSourceRows(result) {
  const information = getSweepInformation(result);
  if (!information?.source) return [];

  return getComponentSweepRows(result).map((row) => {
    const source = row.components.find((component) => component?.id === information.source);
    return {
      sweepValue: row.sweepValue,
      voltage: source?.voltage,
      current: source?.current,
      power: source?.power,
      failed: row.failed || !source,
      error: row.error,
    };
  });
}

function addSeries(series, key, label, unit, values, statuses) {
  if (!Array.isArray(values)) return;
  series.push({
    key,
    label,
    unit,
    values: values.map((value, index) => ({
      value,
      failed: statuses[index]?.status === "failed" || value === null || value === undefined,
      error: statuses[index]?.error ?? null,
    })),
  });
}

export function getSweepResponseSeries(result) {
  const statuses = getSweepPointStatuses(result);
  const series = [];
  const nodeValues = getDataset(result, "node_voltages")?.values;
  const branchValues = getDataset(result, "branch_currents")?.values;
  const componentValues = getDataset(result, "components")?.values;

  const nodeNames = new Set();
  if (Array.isArray(nodeValues)) {
    nodeValues.forEach((snapshot) => {
      Object.keys(snapshot ?? {}).forEach((name) => nodeNames.add(name));
    });
  }
  [...nodeNames].sort().forEach((node) => {
    addSeries(
      series,
      `node:${node}`,
      `V(${node})`,
      "V",
      nodeValues.map((snapshot) => snapshot?.[node]),
      statuses
    );
  });

  const branchNames = new Set();
  if (Array.isArray(branchValues)) {
    branchValues.forEach((snapshot) => {
      Object.keys(snapshot ?? {}).forEach((name) => branchNames.add(name));
    });
  }
  [...branchNames].sort().forEach((branch) => {
    addSeries(
      series,
      `branch:${branch}`,
      `I(${branch})`,
      "A",
      branchValues.map((snapshot) => snapshot?.[branch]),
      statuses
    );
  });

  const componentMap = new Map();
  if (Array.isArray(componentValues)) {
    componentValues.forEach((snapshot) => {
      if (!Array.isArray(snapshot)) return;
      snapshot.forEach((component) => {
        if (!component?.id) return;
        const existing = componentMap.get(component.id) ?? {
          name: component.name ?? component.id,
          voltage: [],
          current: [],
          power: [],
        };
        existing.voltage.push(component.voltage);
        existing.current.push(component.current);
        existing.power.push(component.power);
        componentMap.set(component.id, existing);
      });
    });
  }

  for (const [id, component] of componentMap) {
    addSeries(series, `component:${id}:voltage`, `V(${component.name})`, "V", component.voltage, statuses);
    addSeries(series, `component:${id}:current`, `I(${component.name})`, "A", component.current, statuses);
    addSeries(series, `component:${id}:power`, `P(${component.name})`, "W", component.power, statuses);
  }

  return series;
}
