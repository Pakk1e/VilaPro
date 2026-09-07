export function getDataset(result, name) {
  const datasets = Array.isArray(result?.result?.datasets) ? result.result.datasets : [];
  return datasets.find((dataset) => dataset?.name === name) ?? null;
}

export function getSweepValues(result) {
  const dataset = getDataset(result, "sweep");
  return Array.isArray(dataset?.values) ? dataset.values : [];
}

export function getSweepInformation(result) {
  const information = result?.result?.analysis_information;
  const settings = information?.settings;
  if (!information || information.analysis !== "dc_sweep" || !settings) return null;

  return {
    source: settings.source ?? "",
    parameter: information.sweep?.parameter ?? "V",
    start: settings.start,
    stop: settings.stop,
    step: settings.step,
  };
}

export function getComponentSweepRows(result) {
  const sweepValues = getSweepValues(result);
  const dataset = getDataset(result, "components");
  const snapshots = Array.isArray(dataset?.values) ? dataset.values : [];

  return sweepValues.map((sweepValue, index) => ({
    sweepValue,
    components: Array.isArray(snapshots[index]) ? snapshots[index] : [],
    failed: !Array.isArray(snapshots[index]),
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
    };
  });
}
