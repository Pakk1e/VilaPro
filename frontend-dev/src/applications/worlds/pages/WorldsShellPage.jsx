import { useState } from "react";

import ElectricalWorkspaceShell from "../components/ElectricalWorkspaceShell";
import WorldCanvas from "../components/WorldCanvas";
import ComponentSidebar from "../components/ComponentSidebar";
import WorkspaceTabs, { WORKSPACES } from "../components/WorkspaceTabs";
import { DEFAULT_WORLD_CONTEXT } from "../model/worldContext";

export default function WorldsShellPage() {
  const [workspace, setWorkspace] = useState("design");
  const activeWorkspace = WORKSPACES.find((item) => item.id === workspace) ?? WORKSPACES[0];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f3f5f7]">
      <ElectricalWorkspaceShell
        library={<ComponentSidebar />}
        inspector={<div className="flex flex-1 items-center justify-center px-5 text-center text-xs leading-5 text-[#8a929c]">Select a component, terminal, wire, or result to inspect it.</div>}
        instrument={<div className="flex h-full items-center justify-center text-xs text-[#8a929c]">Run an analysis or probe a circuit quantity to open an instrument.</div>}
      >
        <WorldCanvas workspace={workspace} worldContext={DEFAULT_WORLD_CONTEXT} />
        <div className="absolute left-3 top-3 z-20"><WorkspaceTabs value={workspace} onChange={setWorkspace} /></div>
        <div className="pointer-events-none absolute right-3 top-3 z-20 max-w-[260px] text-right">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667382]">{activeWorkspace.label}</div>
          <div className="mt-0.5 text-[9px] text-[#8a929c]">{activeWorkspace.description}</div>
        </div>
      </ElectricalWorkspaceShell>
    </div>
  );
}
