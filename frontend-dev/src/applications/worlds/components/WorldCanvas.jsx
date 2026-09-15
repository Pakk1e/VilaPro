import { useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Background, Controls, ReactFlow, addEdge, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import WorldNode from "./WorldNode";
import JunctionNode from "./JunctionNode";
import CircuitEdge from "./CircuitEdge";
import SchematicPreview from "./SchematicPreview";
import ComponentSymbolPreview from "./ComponentSymbolPreview";
import { worldDefinitions } from "../model/worldDefinitions";
import { DEFAULT_WORLD_CONTEXT, validateWorldContext } from "../model/worldContext";

const initialNodes = [];
const initialEdges = [];
const nodeTypes = { world: WorldNode, junction: JunctionNode };
const edgeTypes = { circuit: CircuitEdge };

function getNextComponentLabel(nodes, definition) {
  const prefix = definition.type;
  const usedNumbers = nodes.map(node => node.data?.label).map(label => {
    const match = label?.match(new RegExp(`^${prefix} ([0-9]+)$`));
    return match ? Number(match[1]) : null;
  }).filter(Boolean);
  let nextNumber = 1;
  while (usedNumbers.includes(nextNumber)) nextNumber += 1;
  return `${prefix} ${nextNumber}`;
}

function createNodeData(definition, label, definitionKey) {
  const properties = {};
  for (const [key, property] of Object.entries(definition.properties ?? {})) properties[key] = property.defaultValue;
  return { label, description: definition.description, componentType: definition.type, ports: definition.ports ?? [], definitionKey, properties };
}

function getNodePortKind(node, handleId) {
  if (node?.type === "junction") {
    if (handleId === "junction" || handleId?.startsWith("junction-")) return node.data?.portKind ?? "electrical";
    return null;
  }
  return node?.data?.ports?.find(item => item.id === handleId)?.kind ?? null;
}

function canConnect(connection, nodes) {
  if (!connection.source || !connection.sourceHandle || !connection.target || !connection.targetHandle || connection.source === connection.target) return false;
  const sourceNode = nodes.find(node => node.id === connection.source);
  const targetNode = nodes.find(node => node.id === connection.target);
  if (!sourceNode || !targetNode) return false;
  const sourceKind = getNodePortKind(sourceNode, connection.sourceHandle);
  const targetKind = getNodePortKind(targetNode, connection.targetHandle);
  return Boolean(sourceKind && targetKind && sourceKind === targetKind);
}

function getEdgeIdAtPoint(event) {
  return document.elementsFromPoint(event.clientX, event.clientY).find(item => item.classList.contains("react-flow__edge-interaction"))?.parentElement?.dataset?.id ?? null;
}

export default function WorldCanvas({ workspace = "design", worldContext = DEFAULT_WORLD_CONTEXT, onWorkspaceStateChange }) {
  validateWorldContext(worldContext);
  const isDesignWorkspace = workspace === "design";
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [selectedResultEntity, setSelectedResultEntity] = useState(null);
  const [exampleSimulationPreset, setExampleSimulationPreset] = useState(null);
  const [placementDefinitionKey, setPlacementDefinitionKey] = useState(null);
  const [placementPointer, setPlacementPointer] = useState(null);
  const selectedNode = nodes.find(node => node.id === selectedNodeId) ?? null;
  const placementDefinition = placementDefinitionKey ? worldDefinitions[placementDefinitionKey] : null;

  const onConnect = useCallback(connection => {
    if (!canConnect(connection, nodes)) return;
    flushSync(() => setEdges(currentEdges => {
      const exists = currentEdges.some(edge =>
        (edge.source === connection.source && edge.sourceHandle === connection.sourceHandle && edge.target === connection.target && edge.targetHandle === connection.targetHandle) ||
        (edge.source === connection.target && edge.sourceHandle === connection.targetHandle && edge.target === connection.source && edge.targetHandle === connection.sourceHandle)
      );
      return exists ? currentEdges : addEdge({ ...connection, type: "circuit" }, currentEdges);
    }));
  }, [nodes, setEdges]);

  function insertComponent(definitionKey, screenPosition) {
    if (!reactFlowInstance) return;
    const definition = worldDefinitions[definitionKey];
    if (!definition) return;
    const bounds = document.querySelector(".react-flow")?.getBoundingClientRect();
    if (!bounds) return;
    const screen = screenPosition ?? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const flowPosition = reactFlowInstance.screenToFlowPosition(screen);
    const position = {
      x: Math.round((flowPosition.x - 75) / 20) * 20,
      y: Math.round((flowPosition.y - 40) / 20) * 20,
    };
    const label = getNextComponentLabel(nodes, definition);
    const newNode = {
      id: `component-${crypto.randomUUID()}`,
      type: "world",
      position,
      data: createNodeData(definition, label, definitionKey),
    };
    setNodes(current => [...current, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
    setSelectedTerminal(null);
    setSelectedResultEntity(null);
    setExampleSimulationPreset(null);
    window.dispatchEvent(new CustomEvent("worlds:component-placed", { detail: { definitionKey, label, nodeId: newNode.id } }));
  }

  function addComponent(definitionKey) {
    insertComponent(definitionKey);
  }

  function beginPlacement(definitionKey) {
    if (!isDesignWorkspace || !worldDefinitions[definitionKey]) return;
    setPlacementDefinitionKey(definitionKey);
    setPlacementPointer(null);
    setSelectedResultEntity(null);
  }

  function loadExample(example) {
    if (!example) return;
    const graph = example.createGraph();
    setPlacementDefinitionKey(null);
    setPlacementPointer(null);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedTerminal(null);
    setSelectedResultEntity(null);
    setExampleSimulationPreset({ exampleId: example.id, preset: example.simulationPreset });
    requestAnimationFrame(() => reactFlowInstance?.fitView({ padding: .2, duration: 200 }));
  }

  function updateSelectedProperty(nodeId, property, value) {
    if (!nodeId || !property || !isDesignWorkspace) return;
    setNodes(current => current.map(node => node.id !== nodeId ? node : { ...node, data: { ...node.data, properties: { ...(node.data?.properties ?? {}), [property]: value } } }));
  }

  // These handlers intentionally close over the current editor state; the effect is the external-event bridge for the canvas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const resultHandler = event => setSelectedResultEntity(event.detail ?? null);
    const terminalHandler = event => {
      const detail = event.detail ?? null;
      setSelectedNodeId(detail?.nodeId ?? null);
      setSelectedEdgeId(null);
      setSelectedTerminal(detail?.port ? detail : null);
      setSelectedResultEntity(null);
    };
    const clearSelectionHandler = () => {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedTerminal(null);
      setSelectedResultEntity(null);
    };
    const addHandler = event => addComponent(event.detail);
    const placementHandler = event => beginPlacement(event.detail);
    const exampleHandler = event => loadExample(event.detail);
    const propertyHandler = event => updateSelectedProperty(event.detail?.nodeId, event.detail?.property, event.detail?.value);
    const fitViewHandler = () => reactFlowInstance?.fitView({ padding: .2, duration: 180 });
    window.addEventListener("worlds:select-result", resultHandler);
    window.addEventListener("worlds:terminal-select", terminalHandler);
    window.addEventListener("worlds:clear-selection", clearSelectionHandler);
    window.addEventListener("worlds:add-component", addHandler);
    window.addEventListener("worlds:begin-placement", placementHandler);
    window.addEventListener("worlds:load-example", exampleHandler);
    window.addEventListener("worlds:update-property", propertyHandler);
    window.addEventListener("worlds:fit-view", fitViewHandler);
    return () => {
      window.removeEventListener("worlds:select-result", resultHandler);
      window.removeEventListener("worlds:terminal-select", terminalHandler);
      window.removeEventListener("worlds:clear-selection", clearSelectionHandler);
      window.removeEventListener("worlds:add-component", addHandler);
      window.removeEventListener("worlds:begin-placement", placementHandler);
      window.removeEventListener("worlds:load-example", exampleHandler);
      window.removeEventListener("worlds:update-property", propertyHandler);
      window.removeEventListener("worlds:fit-view", fitViewHandler);
    };
  }, [nodes, reactFlowInstance, isDesignWorkspace]);

  useEffect(() => {
    window.__WORLDS_DEBUG__ = { workspace, worldContext, selectedNodeId, selectedEdgeId, selectedTerminal, selectedExampleId: exampleSimulationPreset?.exampleId ?? null, placementDefinitionKey, nodes: structuredClone(nodes), edges: structuredClone(edges) };
    window.dispatchEvent(new CustomEvent("worlds:selection-change", { detail: { selectedNode, selectedEdgeId, selectedTerminal, selectedResultEntity } }));
    onWorkspaceStateChange?.({ nodes: structuredClone(nodes), edges: structuredClone(edges), selectedNodeId, selectedEdgeId, selectedTerminal, selectedResultEntity, exampleSimulationPreset });
    return () => { delete window.__WORLDS_DEBUG__; };
  }, [workspace, worldContext, selectedNodeId, selectedEdgeId, selectedTerminal, selectedResultEntity, exampleSimulationPreset, nodes, edges, selectedNode, onWorkspaceStateChange, placementDefinitionKey]);

  const handleNodesChange = changes => {
    if (!isDesignWorkspace) return;
    onNodesChange(changes);
    for (const change of changes) if (change.type === "remove" && change.id === selectedNodeId) {
      setSelectedNodeId(null);
      setSelectedTerminal(null);
    }
  };

  const handleNodeClick = (_event, node) => {
    if (placementDefinitionKey) return;
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setSelectedTerminal(null);
  };

  const handleEdgeClick = (_event, edge) => {
    if (!isDesignWorkspace || placementDefinitionKey) return;
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setSelectedTerminal(null);
  };

  const handlePaneClick = event => {
    if (placementDefinitionKey) {
      const pane = event.target.closest?.(".react-flow__pane");
      if (pane) {
        insertComponent(placementDefinitionKey, { x: event.clientX, y: event.clientY });
        return;
      }
    }
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSelectedTerminal(null);
    setSelectedResultEntity(null);
  };

  const handleSchematicComponentSelect = id => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setSelectedTerminal(null);
    window.dispatchEvent(new CustomEvent("worlds:select-result", { detail: { entityType: "component", entityId: id } }));
  };

  const onPointerMove = event => {
    if (!placementDefinitionKey) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPlacementPointer({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const onKeyDown = event => {
    const target = event.target;
    const form = target instanceof HTMLElement && (target.matches("input,textarea,select,button") || target.isContentEditable);
    if (form || !isDesignWorkspace) return;
    if (event.key === "Escape") {
      if (placementDefinitionKey) {
        setPlacementDefinitionKey(null);
        setPlacementPointer(null);
        return;
      }
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setSelectedTerminal(null);
      setSelectedResultEntity(null);
      return;
    }
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    event.preventDefault();
    if (selectedNodeId) {
      setNodes(current => current.filter(node => node.id !== selectedNodeId));
      setEdges(current => current.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
      setSelectedNodeId(null);
      setSelectedTerminal(null);
      return;
    }
    if (selectedEdgeId) {
      setEdges(current => current.filter(edge => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  };

  const insertJunctionOnEdge = (event, edge, position) => {
    if (!reactFlowInstance || !isDesignWorkspace) return;
    const junctionPosition = position ?? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const junctionId = `junction-${crypto.randomUUID()}`;
    const junctionNode = { id: junctionId, type: "junction", position: { x: junctionPosition.x - 8, y: junctionPosition.y - 8 }, data: { kind: "junction", portKind: "electrical" } };
    const sourceHandle = edge.sourceHandle;
    const targetHandle = edge.targetHandle;
    const firstEdge = { id: `edge-${crypto.randomUUID()}`, source: edge.source, sourceHandle, target: junctionId, targetHandle: "junction-left", type: "circuit" };
    const secondEdge = { id: `edge-${crypto.randomUUID()}`, source: junctionId, sourceHandle: "junction-right", target: edge.target, targetHandle, type: "circuit" };
    setNodes(current => [...current, junctionNode]);
    setEdges(current => [...current.filter(currentEdge => currentEdge.id !== edge.id), firstEdge, secondEdge]);
  };

  const handleConnectEnd = (event, connectionState) => {
    if (!isDesignWorkspace || connectionState.isValid || !connectionState.fromNode || !reactFlowInstance) return;
    const edgeId = getEdgeIdAtPoint(event);
    const edge = edges.find(current => current.id === edgeId);
    if (!edge) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const junctionId = `junction-${crypto.randomUUID()}`;
    const junctionNode = { id: junctionId, type: "junction", position: { x: position.x - 8, y: position.y - 8 }, data: { kind: "junction", portKind: "electrical" } };
    const sourceHandle = connectionState.fromHandle?.id;
    if (!sourceHandle) return;
    const firstEdge = { id: `edge-${crypto.randomUUID()}`, source: edge.source, sourceHandle: edge.sourceHandle, target: junctionId, targetHandle: "junction-left", type: "circuit" };
    const secondEdge = { id: `edge-${crypto.randomUUID()}`, source: junctionId, sourceHandle: "junction-right", target: edge.target, targetHandle: edge.targetHandle, type: "circuit" };
    const newComponentEdge = { id: `edge-${crypto.randomUUID()}`, source: connectionState.fromNode.id, sourceHandle, target: junctionId, targetHandle: "junction-bottom", type: "circuit" };
    setNodes(current => [...current, junctionNode]);
    setEdges(current => [...current.filter(currentEdge => currentEdge.id !== edgeId), firstEdge, secondEdge, newComponentEdge]);
  };

  const flowClass = isDesignWorkspace ? "absolute inset-0" : "absolute inset-0 pointer-events-none opacity-0";

  return <div data-testid="worlds-canvas" data-world-id={worldContext.worldId} data-layer-id={worldContext.layerId} data-representation-id={worldContext.representationId} aria-label="Schematic canvas" className={`relative h-full w-full ${isDesignWorkspace ? "bg-[#f8f9f7]" : "bg-[#f2f4f5]"}`} tabIndex={0} onKeyDown={onKeyDown} onPointerMove={onPointerMove}>
    <div className={flowClass} aria-hidden={!isDesignWorkspace}>
      <ReactFlow nodes={nodes} edges={edges} edgeTypes={edgeTypes} nodeTypes={nodeTypes} connectionMode="loose" defaultEdgeOptions={{ type: "circuit", interactionWidth: 30 }} connectionLineType="step" nodesDraggable={isDesignWorkspace && !placementDefinitionKey} nodesConnectable={isDesignWorkspace && !placementDefinitionKey} elementsSelectable={isDesignWorkspace && !placementDefinitionKey} onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange} onEdgeClick={handleEdgeClick} onEdgeDoubleClick={insertJunctionOnEdge} onConnect={onConnect} onConnectEnd={handleConnectEnd} onInit={setReactFlowInstance} onNodeClick={handleNodeClick} onPaneClick={handlePaneClick} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#d9dee3" gap={24} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>
    </div>
    {!isDesignWorkspace && <SchematicPreview nodes={nodes} edges={edges} selectedNodeId={selectedNodeId} onSelectComponent={handleSchematicComponentSelect} selectedResultEntity={selectedResultEntity} />}
    {placementDefinition && placementPointer && <div className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#8ea0b1] bg-white/92 px-3 py-2 shadow-[0_8px_22px_rgba(24,37,58,0.14)] backdrop-blur" style={{ left: placementPointer.x, top: placementPointer.y }}>
      <ComponentSymbolPreview type={placementDefinition.type} className="h-10 w-20" />
      <div className="mt-1 text-center text-[9px] font-semibold text-[#31455d]">{placementDefinition.type}</div>
    </div>}
    {placementDefinition && <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-[#cbd5de] bg-white/94 px-3 py-1.5 text-[9px] font-semibold text-[#52667b] shadow-[0_4px_12px_rgba(24,37,58,0.08)] backdrop-blur">Place {placementDefinition.type} · click to place · Esc to cancel</div>}
    {isDesignWorkspace && <div className="pointer-events-none absolute bottom-4 right-4 z-10 text-[8px] font-medium uppercase tracking-[0.12em] text-[#a0a8b1]">Scroll to zoom · drag to pan</div>}
  </div>;
}
