const WORKSPACES = [
  { id: "design", label: "Design", description: "Build and edit the circuit." },
  { id: "simulation", label: "Simulate", description: "Run analysis and inspect measurements." },
];

export default function WorkspaceTabs({ value, onChange }) {
  return <div data-testid="workspace-tabs" className="inline-flex items-center rounded-md border border-[#d5dce3] bg-[#f4f6f7] p-0.5">
    {WORKSPACES.map(workspace => {
      const active = workspace.id === value;
      return <button key={workspace.id} type="button" onClick={() => onChange(workspace.id)} aria-current={active ? "page" : undefined} className={["relative rounded px-3 py-1.5 text-[10px] font-semibold transition", active ? "bg-white text-[#26384e] shadow-[0_1px_3px_rgba(24,37,58,0.09)]" : "text-[#7b8795] hover:text-[#40536a]"].join(" ")}>{workspace.label}</button>;
    })}
  </div>;
}

export { WORKSPACES };
