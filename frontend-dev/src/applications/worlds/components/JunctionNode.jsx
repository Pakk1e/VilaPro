import { Handle, Position } from "@xyflow/react";

const handles = [
  {
    id: "junction-top",
    position: Position.Top,
    className: "!left-1/2 !top-1/2",
  },
  {
    id: "junction-right",
    position: Position.Right,
    className: "!left-1/2 !top-1/2",
  },
  {
    id: "junction-bottom",
    position: Position.Bottom,
    className: "!left-1/2 !top-1/2",
  },
  {
    id: "junction-left",
    position: Position.Left,
    className: "!left-1/2 !top-1/2",
  },
];

export default function JunctionNode() {
  return (
    <div className="relative h-4 w-4">
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#26364d]" />

      {handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="source"
          position={handle.position}
          isConnectable
          className={[
            "!h-4 !w-4 !border-0 !bg-transparent",
            handle.className,
          ].join(" ")}
        />
      ))}
    </div>
  );
}
