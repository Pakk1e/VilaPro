import { useState, useCallback } from "react";

import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import WorldNode from "./WorldNode";
import JunctionNode from "./JunctionNode";
import CircuitEdge from "./CircuitEdge";
import SimulationPanel from "./SimulationPanel";
import ComponentSidebar from "./ComponentSidebar";
import { worldDefinitions } from "../model/worldDefinitions";

const initialNodes = [];
const initialEdges = [];

const nodeTypes = {
  world: WorldNode,
  junction: JunctionNode,
};

const edgeTypes = {
  circuit: CircuitEdge,
};

function getNextComponentLabel(nodes, definition) {
  const prefix = definition.type;

  const usedNumbers = nodes
    .map((node) => node.data?.label)
    .map((label) => {
      const match = label?.match(new RegExp(`^${prefix} ([0-9]+)$`));
      return match ? Number(match[1]) : null;
    })
    .filter(Boolean);

  let nextNumber = 1;

  while (usedNumbers.includes(nextNumber)) {
    nextNumber += 1;
  }

  return `${prefix} ${nextNumber}`;
}

function createNodeData(definition, label, definitionKey) {
  const properties = {};

  for (const [key, property] of Object.entries(definition.properties ?? {})) {
    properties[key] = property.defaultValue;
  }

  return {
    label,
    description: definition.description,
    componentType: definition.type,
    ports: definition.ports ?? [],
    definitionKey,
    properties,
  };
}

function getNodePortKind(node, handleId) {
  if (node?.type === "junction") {
    if (handleId === "junction" || handleId?.startsWith("junction-")) {
      return node.data?.portKind ?? "electrical";
    }

    return null;
  }

  const port = node?.data?.ports?.find((item) => item.id === handleId);
  return port?.kind ?? null;
}

function canConnect(connection, nodes) {
  if (
    !connection.source ||
    !connection.sourceHandle ||
    !connection.target ||
    !connection.targetHandle
  ) {
    return false;
  }

  if (connection.source === connection.target) {
    return false;
  }

  const sourceNode = nodes.find((node) => node.id === connection.source);
  const targetNode = nodes.find((node) => node.id === connection.target);

  if (!sourceNode || !targetNode) {
    return false;
  }

  const sourceKind = getNodePortKind(sourceNode, connection.sourceHandle);
  const targetKind = getNodePortKind(targetNode, connection.targetHandle);

  if (!sourceKind || !targetKind) {
    return false;
  }

  return sourceKind === targetKind;
}

function getEdgeIdAtPoint(event) {
  const element = document
    .elementsFromPoint(event.clientX, event.clientY)
    .find((item) => item.classList.contains("react-flow__edge-interaction"));

  return element?.parentElement?.dataset?.id ?? null;
}

function getJunctionHandle(position, endpoint) {
  const dx = endpoint.x - position.x;
  const dy = endpoint.y - position.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? "junction-left" : "junction-right";
  }

  return dy < 0 ? "junction-top" : "junction-bottom";
}

export default function WorldCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const onConnect = useCallback(
    (connection) => {
      if (!canConnect(connection, nodes)) {
        return;
      }

      setEdges((currentEdges) => {
        const alreadyConnected = currentEdges.some(
          (edge) =>
            edge.source === connection.source &&
            edge.sourceHandle === connection.sourceHandle &&
            edge.target === connection.target &&
            edge.targetHandle === connection.targetHandle
        );

        if (alreadyConnected) {
          return currentEdges;
        }

        return addEdge(
          {
            ...connection,
            type: "circuit",
          },
          currentEdges
        );
      });
    },
    [nodes, setEdges]
  );

  const addComponent = (definitionKey) => {
    if (!reactFlowInstance) {
      return;
    }

    const definition = worldDefinitions[definitionKey];

    if (!definition) {
      return;
    }

    const bounds = document.querySelector(".react-flow")?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });

    const label = getNextComponentLabel(nodes, definition);

    const newNode = {
      id: `component-${crypto.randomUUID()}`,
      type: "world",
      position: {
        x: position.x - 140,
        y: position.y - 80,
      },
      data: createNodeData(definition, label, definitionKey),
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  const updateSelectedProperty = (property, value) => {
    if (!selectedNodeId) {
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== selectedNodeId) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            properties: {
              ...(node.data?.properties ?? {}),
              [property]: value,
            },
          },
        };
      })
    );
  };

  const handleNodesChange = (changes) => {
    onNodesChange(changes);

    for (const change of changes) {
      if (change.type === "remove" && change.id === selectedNodeId) {
        setSelectedNodeId(null);
      }
    }
  };

  const handleNodeClick = (_event, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const handleEdgeClick = (_event, edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      return;
    }

    if (event.key !== "Delete") {
      return;
    }

    if (selectedNodeId) {
      setNodes((currentNodes) =>
        currentNodes.filter((node) => node.id !== selectedNodeId)
      );

      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) =>
            edge.source !== selectedNodeId && edge.target !== selectedNodeId
        )
      );

      setSelectedNodeId(null);
      return;
    }

    if (selectedEdgeId) {
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => edge.id !== selectedEdgeId)
      );

      setSelectedEdgeId(null);
    }
  };

  const insertJunctionOnEdge = (event, edge, position) => {
    if (!reactFlowInstance) {
      return;
    }

    const junctionPosition =
      position ??
      reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

    const junctionId = `junction-${crypto.randomUUID()}`;

    const sourceNodeElement = document.querySelector(
      `.react-flow__node[data-id="${edge.source}"]`
    );
    const targetNodeElement = document.querySelector(
      `.react-flow__node[data-id="${edge.target}"]`
    );

    if (!sourceNodeElement || !targetNodeElement) {
      return;
    }

    const sourceRect = sourceNodeElement.getBoundingClientRect();
    const targetRect = targetNodeElement.getBoundingClientRect();

    const sourcePoint = {
      x: sourceRect.left + sourceRect.width / 2,
      y: sourceRect.top + sourceRect.height / 2,
    };
    const targetPoint = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    };
    const junctionScreenPoint = {
      x: event.clientX,
      y: event.clientY,
    };

    const sourceHandle = getJunctionHandle(junctionScreenPoint, sourcePoint);
    const targetHandle = getJunctionHandle(junctionScreenPoint, targetPoint);

    const junctionNode = {
      id: junctionId,
      type: "junction",
      position: {
        x: junctionPosition.x - 8,
        y: junctionPosition.y - 8,
      },
      data: {
        kind: "junction",
        portKind: "electrical",
      },
    };

    const firstEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: junctionId,
      targetHandle: sourceHandle,
      type: "circuit",
    };

    const secondEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: junctionId,
      sourceHandle: targetHandle,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: "circuit",
    };

    setNodes((currentNodes) => [...currentNodes, junctionNode]);
    setEdges((currentEdges) => [
      ...currentEdges.filter((currentEdge) => currentEdge.id !== edge.id),
      firstEdge,
      secondEdge,
    ]);
    setSelectedNodeId(junctionId);
    setSelectedEdgeId(null);
  };

  const handleConnectEnd = (event, connectionState) => {
    if (connectionState.isValid || !connectionState.fromNode || !reactFlowInstance) {
      return;
    }

    const edgeId = getEdgeIdAtPoint(event);

    if (!edgeId) {
      return;
    }

    const edge = edges.find((currentEdge) => currentEdge.id === edgeId);

    if (!edge) {
      return;
    }

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const junctionId = `junction-${crypto.randomUUID()}`;

    const junctionNode = {
      id: junctionId,
      type: "junction",
      position: {
        x: position.x - 8,
        y: position.y - 8,
      },
      data: {
        kind: "junction",
        portKind: "electrical",
      },
    };

    const sourceHandle = connectionState.fromHandle?.id;

    if (!sourceHandle) {
      return;
    }

    const firstEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: junctionId,
      targetHandle: "junction-left",
      type: "circuit",
    };

    const secondEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: junctionId,
      sourceHandle: "junction-right",
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: "circuit",
    };

    const newComponentEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: connectionState.fromNode.id,
      sourceHandle,
      target: junctionId,
      targetHandle: "junction-bottom",
      type: "circuit",
    };

    setNodes((currentNodes) => [...currentNodes, junctionNode]);
    setEdges((currentEdges) => [
      ...currentEdges.filter((currentEdge) => currentEdge.id !== edge.id),
      firstEdge,
      secondEdge,
      newComponentEdge,
    ]);
    setSelectedNodeId(junctionId);
    setSelectedEdgeId(null);
  };

  return (
    <div
      className="relative h-full w-full"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        connectionMode="loose"
        defaultEdgeOptions={{
          type: "circuit",
          interactionWidth: 30,
        }}
        connectionLineType="smoothstep"
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={handleEdgeClick}
        onConnect={onConnect}
        onConnectEnd={handleConnectEnd}
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onEdgeDoubleClick={insertJunctionOnEdge}
        fitView
      >
        <Background />
        <Controls />

        <SimulationPanel
          nodes={nodes}
          edges={edges}
          onSelectComponent={setSelectedNodeId}
        />

        <ComponentSidebar
          nodes={nodes.filter((node) => node.type === "world")}
          selectedNode={selectedNode?.type === "world" ? selectedNode : null}
          onAddComponent={addComponent}
          onSelectComponent={(id) => {
            setSelectedNodeId(id);
            setSelectedEdgeId(null);
          }}
          onChangeProperty={updateSelectedProperty}
        />
      </ReactFlow>
    </div>
  );
}
