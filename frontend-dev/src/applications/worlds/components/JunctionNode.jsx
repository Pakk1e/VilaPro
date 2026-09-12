import { Handle, Position } from "@xyflow/react";

const handles = [
  ["junction-top", Position.Top],
  ["junction-right", Position.Right],
  ["junction-bottom", Position.Bottom],
  ["junction-left", Position.Left],
];

export default function JunctionNode() {
  return <div data-testid="junction-node" className="relative h-4 w-4">
    <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#26364d]" />
    {handles.map(([id, position])=><Handle key={id} id={id} type="source" position={position} isConnectable className="!h-4 !w-4 !border-0 !bg-transparent !left-1/2 !top-1/2" title="Junction"/>)}
  </div>;
}
