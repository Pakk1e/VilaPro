const WORKSPACES = [
  { id: "design", label: "Design", description: "Build and edit the circuit topology and component values." },
  { id: "simulation", label: "Simulation", description: "Configure an analysis, run the circuit, and inspect results." },
];

export default function WorkspaceTabs({ value, onChange }) {
  return <div data-testid="workspace-tabs" className="flex items-center gap-0 border border-[#cfd5dc] bg-white">
    {WORKSPACES.map(workspace=>{const active=workspace.id===value;return <button key={workspace.id} type="button" onClick={()=>onChange(workspace.id)} aria-current={active?"page":undefined} className={["border-r border-[#e1e5e9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] last:border-r-0",active?"bg-[#eef2f6] text-[#17253a]":"bg-white text-[#69717b] hover:bg-[#f8fafc]"].join(" ")}>{workspace.label}</button>;})}
  </div>;
}

export { WORKSPACES };
