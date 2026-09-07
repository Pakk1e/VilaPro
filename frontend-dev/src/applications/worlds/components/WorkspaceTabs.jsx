const WORKSPACES = [
  {
    id: "design",
    label: "Circuit Design",
    description: "Build and edit the circuit topology and component values.",
  },
  {
    id: "simulation",
    label: "Simulation",
    description: "Configure an analysis, run the circuit, and inspect results.",
  },
];

export default function WorkspaceTabs({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[#e4e7eb] bg-[#fafbfc] p-1">
      {WORKSPACES.map((workspace) => {
        const active = workspace.id === value;

        return (
          <button
            key={workspace.id}
            type="button"
            onClick={() => onChange(workspace.id)}
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-white text-[#17253a] shadow-sm"
                : "text-[#69717b] hover:bg-white/70 hover:text-[#26364d]",
            ].join(" ")}
          >
            {workspace.label}
          </button>
        );
      })}
    </div>
  );
}

export { WORKSPACES };
