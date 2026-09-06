import {
  BaseEdge,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";

export default function CircuitEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  markerStart,
  markerEnd,
  interactionWidth,
  style,
  selected,
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
      style={{
        strokeWidth: selected ? 2.5 : 1.5,
        ...style,
      }}
    />
  );
}
