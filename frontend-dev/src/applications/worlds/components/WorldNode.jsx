import { Handle, Position } from "@xyflow/react";

const POSITION_MAP = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom };
const STROKE = "#26364d";
const MUTED = "#69717b";

function Symbol({ type }) {
  if (type === "Voltage Source" || type === "Current Source") return <><line x1="10" y1="55" x2="48" y2="55" stroke={STROKE} strokeWidth="2.2"/><circle cx="75" cy="55" r="27" fill="#fbfcfd" stroke={STROKE} strokeWidth="2.2"/><line x1="102" y1="55" x2="140" y2="55" stroke={STROKE} strokeWidth="2.2"/>{type === "Voltage Source" ? <><line x1="66" y1="45" x2="84" y2="45" stroke={STROKE} strokeWidth="1.8"/><line x1="75" y1="36" x2="75" y2="54" stroke={STROKE} strokeWidth="1.8"/><line x1="66" y1="65" x2="84" y2="65" stroke={STROKE} strokeWidth="1.8"/></> : <path d="M64 55 L84 55 M75 45 L75 65" stroke={STROKE} strokeWidth="1.8"/>}</>;
  if (type === "Resistor") return <><line x1="10" y1="55" x2="48" y2="55" stroke={STROKE} strokeWidth="2.2"/><path d="M48 55 L58 43 L70 67 L82 43 L94 67 L106 55" fill="none" stroke={STROKE} strokeWidth="2.6" strokeLinejoin="round"/><line x1="106" y1="55" x2="140" y2="55" stroke={STROKE} strokeWidth="2.2"/></>;
  if (type === "Capacitor") return <><line x1="10" y1="55" x2="67" y2="55" stroke={STROKE} strokeWidth="2.2"/><line x1="67" y1="35" x2="67" y2="75" stroke={STROKE} strokeWidth="2.6"/><line x1="83" y1="35" x2="83" y2="75" stroke={STROKE} strokeWidth="2.6"/><line x1="83" y1="55" x2="140" y2="55" stroke={STROKE} strokeWidth="2.2"/></>;
  if (type === "Inductor") return <><line x1="10" y1="55" x2="45" y2="55" stroke={STROKE} strokeWidth="2.2"/><path d="M45 55 C45 30 60 30 60 55 C60 30 75 30 75 55 C75 30 90 30 90 55 C90 30 105 30 105 55" fill="none" stroke={STROKE} strokeWidth="2.2"/><line x1="105" y1="55" x2="140" y2="55" stroke={STROKE} strokeWidth="2.2"/></>;
  if (type === "Diode") return <><line x1="10" y1="55" x2="55" y2="55" stroke={STROKE} strokeWidth="2.2"/><path d="M55 34 L92 55 L55 76 Z" fill="#fbfcfd" stroke={STROKE} strokeWidth="2.2"/><line x1="92" y1="32" x2="92" y2="78" stroke={STROKE} strokeWidth="2.6"/><line x1="92" y1="55" x2="140" y2="55" stroke={STROKE} strokeWidth="2.2"/></>;
  if (type === "Ground") return <><line x1="75" y1="22" x2="75" y2="55" stroke={STROKE} strokeWidth="2.2"/><line x1="48" y1="55" x2="102" y2="55" stroke={STROKE} strokeWidth="2.2"/><line x1="56" y1="64" x2="94" y2="64" stroke={STROKE} strokeWidth="2.2"/><line x1="65" y1="73" x2="85" y2="73" stroke={STROKE} strokeWidth="2.2"/></>;
  if (["NPN Transistor", "PNP Transistor"].includes(type)) return <><line x1="10" y1="55" x2="52" y2="55" stroke={STROKE} strokeWidth="2.2"/><line x1="52" y1="25" x2="52" y2="85" stroke={STROKE} strokeWidth="2.7"/><line x1="58" y1="38" x2="105" y2="22" stroke={STROKE} strokeWidth="2.2"/><line x1="58" y1="72" x2="105" y2="88" stroke={STROKE} strokeWidth="2.2"/><line x1="105" y1="22" x2="140" y2="22" stroke={STROKE} strokeWidth="2.2"/><line x1="105" y1="88" x2="140" y2="88" stroke={STROKE} strokeWidth="2.2"/><path d={type === "PNP Transistor" ? "M72 31 L58 38 L70 42" : "M91 83 L105 88 L92 92"} fill="none" stroke={STROKE} strokeWidth="1.8"/><text x="38" y="47" fontSize="8" fill={MUTED}>B</text><text x="111" y="19" fontSize="8" fill={MUTED}>C</text><text x="111" y="99" fontSize="8" fill={MUTED}>E</text></>;
  if (["NMOS", "PMOS"].includes(type)) return <><line x1="10" y1="55" x2="45" y2="55" stroke={STROKE} strokeWidth="2.2"/><line x1="52" y1="25" x2="52" y2="85" stroke={STROKE} strokeWidth="2.7"/><line x1="67" y1="25" x2="67" y2="85" stroke={STROKE} strokeWidth="2.2"/><line x1="67" y1="25" x2="105" y2="22" stroke={STROKE} strokeWidth="2.2"/><line x1="67" y1="85" x2="105" y2="88" stroke={STROKE} strokeWidth="2.2"/><line x1="105" y1="22" x2="140" y2="22" stroke={STROKE} strokeWidth="2.2"/><line x1="105" y1="88" x2="140" y2="88" stroke={STROKE} strokeWidth="2.2"/>{type === "PMOS" && <circle cx="45" cy="55" r="4" fill="#fbfcfd" stroke={STROKE} strokeWidth="1.6"/>}<text x="32" y="47" fontSize="8" fill={MUTED}>G</text><text x="111" y="19" fontSize="8" fill={MUTED}>D</text><text x="111" y="99" fontSize="8" fill={MUTED}>S</text></>;
  return <><line x1="10" y1="55" x2="48" y2="55" stroke={STROKE} strokeWidth="2.2"/><rect x="48" y="35" width="54" height="40" fill="#fbfcfd" stroke={STROKE} strokeWidth="2.2"/><line x1="102" y1="55" x2="140" y2="55" stroke={STROKE} strokeWidth="2.2"/></>;
}

function formatValue(value) { if (value === undefined || value === null || value === "") return null; if (typeof value === "number") return Number.isFinite(value) ? String(value) : null; return String(value); }

export default function WorldNode({ id, data, selected }) {
  const ports = data?.ports ?? [];
  const handlePortClick = (event, port) => { event.stopPropagation(); window.dispatchEvent(new CustomEvent("worlds:terminal-select", { detail: { nodeId: id, port } })); };
  const reference = data?.reference ?? data?.label ?? "Unnamed";
  const value = formatValue(data?.properties?.value ?? data?.properties?.resistance ?? data?.properties?.capacitance ?? data?.properties?.inductance);
  return <div className="relative h-[116px] w-[180px] overflow-visible">
    {selected && <div className="pointer-events-none absolute left-[15px] top-[5px] h-[100px] w-[150px] rounded-md border border-[#8ea1b4]/55 bg-[#e9eef3]/35" aria-hidden="true" />}
    {ports.map(port => <Handle key={port.id} id={port.id} type="source" position={POSITION_MAP[port.position] ?? Position.Right} isConnectable className={`!h-2 !w-2 !border !border-[#fbfcfd] ${selected ? "!bg-[#3c5d7d]" : "!bg-[#26364d]"}`} onClick={event => handlePortClick(event, port)} title={`${port.label ?? port.id} — ${port.kind}`} />)}
    <svg viewBox="0 0 150 110" className="absolute left-[15px] top-0 h-[110px] w-[150px] overflow-visible" aria-hidden="true"><Symbol type={data?.componentType}/><text x="75" y="98" textAnchor="middle" fontSize="10" fontWeight="600" fill="#17253a">{reference}</text>{value&&<text x="75" y="109" textAnchor="middle" fontSize="9" fill={MUTED}>{value}</text>}</svg>
  </div>;
}
