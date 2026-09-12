const WORKSPACES = [
  { id: "design", label: "Design", description: "Build and edit the circuit topology and component values." },
  { id: "simulation", label: "Simulate", description: "Configure an analysis, run the circuit, and inspect results." },
];

export default function WorkspaceTabs({ value, onChange }) {
  return <div data-testid="workspace-tabs" className="inline-flex items-center rounded-lg border border-[#d7dde3] bg-white/75 p-0.5 shadow-[0_1px_2px_rgba(24,37,58,0.035)]">
    {WORKSPACES.map(workspace => {
      const active = workspace.id === value;
      return <button key={workspace.id} type="button" onClick={() => onChange(workspace.id)} aria-current={active ? "page" : undefined} className={["rounded-md px-3 py-1.5 text-[10px] font-semibold transition", active ? "bg-[#eef2f5] text-[#26384e] shadow-[0_1px_2px_rgba(24,37,58,0.06)]" : "text-[#738195] hover:bg-[#f4f6f8] hover:text-[#40536a]"].join(" ")}>{workspace.label}</button>;
    })}
  </div>;
}

export { WORKSPACES };
