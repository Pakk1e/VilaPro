import { useMemo, useState } from "react";
import ElectricalWorkspaceShell from "../components/ElectricalWorkspaceShell";
import WorldCanvas from "../components/WorldCanvas";
import ComponentLibrary from "../components/ComponentLibrary";
import WorkspaceInspector from "../components/WorkspaceInspector";
import SimulationPanel from "../components/SimulationPanel";
import WorkspaceTabs, { WORKSPACES } from "../components/WorkspaceTabs";
import { DEFAULT_WORLD_CONTEXT } from "../model/worldContext";
import { worldDefinitions } from "../model/worldDefinitions";

export default function WorldsShellPage() {
  const [workspace,setWorkspace]=useState("design");
  const [workspaceState,setWorkspaceState]=useState({nodes:[],edges:[],selectedNodeId:null,selectedEdgeId:null,selectedResultEntity:null,exampleSimulationPreset:null});
  const activeWorkspace=WORKSPACES.find(item=>item.id===workspace)??WORKSPACES[0];
  const sweepTargets=useMemo(()=>workspaceState.nodes.filter(node=>node.type==="world").map(node=>{const definition=worldDefinitions[node.data?.definitionKey],parameters=definition?.simulationParameters??[];return parameters.length?{id:node.id,label:node.data?.label??node.id,componentType:node.data?.componentType??"Component",parameters}:null;}).filter(Boolean),[workspaceState.nodes]);
  return <div className="h-screen w-full overflow-hidden bg-[#f3f5f7]"><ElectricalWorkspaceShell library={<ComponentLibrary/>} inspector={<WorkspaceInspector/>} instrument={<SimulationPanel nodes={workspaceState.nodes} edges={workspaceState.edges} sweepTargets={sweepTargets} selectedNodeId={workspaceState.selectedNodeId} exampleSimulationPreset={workspaceState.exampleSimulationPreset}/>} headerCenter={<div className="flex min-w-0 items-center justify-center gap-3"><WorkspaceTabs value={workspace} onChange={setWorkspace}/><div className="hidden min-w-0 truncate text-[9px] text-[#8a929c] lg:block">{activeWorkspace.description}</div></div>}><WorldCanvas workspace={workspace} worldContext={DEFAULT_WORLD_CONTEXT} onWorkspaceStateChange={setWorkspaceState}/></ElectricalWorkspaceShell></div>;
}
