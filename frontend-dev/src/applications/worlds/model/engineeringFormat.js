const PREFIXES = [
  { factor: 1e6, symbol: "M" },
  { factor: 1e3, symbol: "k" },
  { factor: 1, symbol: "" },
  { factor: 1e-3, symbol: "m" },
  { factor: 1e-6, symbol: "µ" },
  { factor: 1e-9, symbol: "n" },
  { factor: 1e-12, symbol: "p" },
  { factor: 1e-15, symbol: "f" },
];

function trimTrailingZeros(value) {
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

function cleanNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;

  // Avoid rendering a rounded negative zero while retaining genuinely small
  // non-zero values at a useful precision.
  if (Math.abs(number) < 1e-15) return "0";

  const absolute = Math.abs(number);
  if (absolute >= 100) return trimTrailingZeros(number.toFixed(1));
  if (absolute >= 10) return number.toFixed(1);
  if (absolute >= 1) return trimTrailingZeros(number.toFixed(2));
  return trimTrailingZeros(number.toFixed(3));
}

export function getEngineeringScale(values, unit = "") {
  const finiteValues = (Array.isArray(values) ? values : [values])
    .map(Number)
    .filter(Number.isFinite)
    .map(Math.abs)
    .filter((value) => value > 0);

  if (finiteValues.length === 0) return { factor: 1, symbol: unit };

  const magnitude = Math.max(...finiteValues);
  const prefix = PREFIXES.find(({ factor }) => magnitude >= factor) ?? PREFIXES[PREFIXES.length - 1];
  return { factor: prefix.factor, symbol: `${prefix.symbol}${unit}` };
}

export function formatEngineeringValue(value, unit = "", { scale } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  const resolvedScale = scale ?? getEngineeringScale([number], unit);
  const scaled = number / resolvedScale.factor;
  return `${cleanNumber(scaled)} ${resolvedScale.symbol}`.trim();
}

export function formatEngineeringTick(value, unit = "", scale) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  const resolvedScale = scale ?? getEngineeringScale([number], unit);
  return cleanNumber(number / resolvedScale.factor);
}
