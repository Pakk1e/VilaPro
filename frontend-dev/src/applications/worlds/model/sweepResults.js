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
  const sweepValues = getSweepValues(result);
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
      sweepValues.map((_, index) => nodeValues?.[index]?.[node]),
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
      sweepValues.map((_, index) => branchValues?.[index]?.[branch]),
      statuses
    );
  });

  const componentMap = new Map();
  if (Array.isArray(componentValues)) {
    componentValues.forEach((snapshot) => {
      if (!Array.isArray(snapshot)) return;
      snapshot.forEach((component) => {
        if (!component?.id) return;
        if (!componentMap.has(component.id)) {
          componentMap.set(component.id, { name: component.name ?? component.id });
        }
      });
    });
  }

  for (const [id, component] of componentMap) {
    const valuesFor = (property) => sweepValues.map((_, index) => {
      const snapshot = componentValues?.[index];
      if (!Array.isArray(snapshot)) return undefined;
      return snapshot.find((item) => item?.id === id)?.[property];
    });
    addSeries(series, `component:${id}:voltage`, `V(${component.name})`, "V", valuesFor("voltage"), statuses);
    addSeries(series, `component:${id}:current`, `I(${component.name})`, "A", valuesFor("current"), statuses);
    addSeries(series, `component:${id}:power`, `P(${component.name})`, "W", valuesFor("power"), statuses);
  }

  return series;
}
