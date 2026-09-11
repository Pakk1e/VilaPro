import { useState } from "react";

import WorldCanvas from "../components/WorldCanvas";
import WorkspaceTabs, { WORKSPACES } from "../components/WorkspaceTabs";
import { DEFAULT_WORLD_CONTEXT } from "../model/worldContext";

export default function WorldsShellPage() {
  const [workspace, setWorkspace] = useState("design");
  const activeWorkspace =
    WORKSPACES.find((item) => item.id === workspace) ?? WORKSPACES[0];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f6f6f4] p-4">
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-[#dedfdf] bg-white">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#dedfdf] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#69717b]">
              VilaPro World
            </div>
            <div className="mt-1 text-sm font-semibold text-[#17253a]">
              {activeWorkspace.label}
            </div>
            <div className="mt-0.5 text-[10px] text-[#9aa0a7]">
              {activeWorkspace.description}
            </div>
          </div>

          <WorkspaceTabs value={workspace} onChange={setWorkspace} />
        </div>

        <div className="min-h-0 flex-1">
          <WorldCanvas workspace={workspace} worldContext={DEFAULT_WORLD_CONTEXT} />
        </div>
      </section>
    </div>
  );
}
