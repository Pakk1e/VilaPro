import {
  BaseEdge,
  Position,
  useNodes,
} from "@xyflow/react";

const GRID_SIZE = 20;
const CLEARANCE = 24;
const TURN_COST = 35;

function directionVector(position) {
  switch (position) {
    case Position.Left:
      return { x: -1, y: 0 };

    case Position.Right:
      return { x: 1, y: 0 };

    case Position.Top:
      return { x: 0, y: -1 };

    case Position.Bottom:
      return { x: 0, y: 1 };

    default:
      return { x: 1, y: 0 };
  }
}

function key(x, y) {
  return `${x}:${y}`;
}

function snap(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function inside(point, obstacle) {
  return (
    point.x > obstacle.left &&
    point.x < obstacle.right &&
    point.y > obstacle.top &&
    point.y < obstacle.bottom
  );
}

function segmentBlocked(a, b, obstacles) {
  if (a.x !== b.x && a.y !== b.y) {
    return true;
  }

  if (a.x === b.x) {
    const top = Math.min(a.y, b.y);
    const bottom = Math.max(a.y, b.y);

    return obstacles.some(
      (obstacle) =>
        a.x > obstacle.left &&
        a.x < obstacle.right &&
        bottom > obstacle.top &&
        top < obstacle.bottom
    );
  }

  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);

  return obstacles.some(
    (obstacle) =>
      a.y > obstacle.top &&
      a.y < obstacle.bottom &&
      right > obstacle.left &&
      left < obstacle.right
  );
}

function buildGrid(start, end, obstacles) {
  const allX = [
    start.x,
    end.x,
    ...obstacles.flatMap((o) => [
      o.left,
      o.right,
    ]),
  ];

  const allY = [
    start.y,
    end.y,
    ...obstacles.flatMap((o) => [
      o.top,
      o.bottom,
    ]),
  ];

  const minX =
    Math.floor(
      (Math.min(...allX) - 200) /
        GRID_SIZE
    ) * GRID_SIZE;

  const maxX =
    Math.ceil(
      (Math.max(...allX) + 200) /
        GRID_SIZE
    ) * GRID_SIZE;

  const minY =
    Math.floor(
      (Math.min(...allY) - 200) /
        GRID_SIZE
    ) * GRID_SIZE;

  const maxY =
    Math.ceil(
      (Math.max(...allY) + 200) /
        GRID_SIZE
    ) * GRID_SIZE;

  const points = new Map();

  for (
    let x = minX;
    x <= maxX;
    x += GRID_SIZE
  ) {
    for (
      let y = minY;
      y <= maxY;
      y += GRID_SIZE
    ) {
      const point = { x, y };

      if (
        obstacles.some((obstacle) =>
          inside(point, obstacle)
        )
      ) {
        continue;
      }

      points.set(key(x, y), point);
    }
  }

  return points;
}

function heuristic(a, b) {
  return (
    Math.abs(a.x - b.x) +
    Math.abs(a.y - b.y)
  );
}

function getNeighbors(point, grid, obstacles) {
  const candidates = [
    {
      x: point.x + GRID_SIZE,
      y: point.y,
    },
    {
      x: point.x - GRID_SIZE,
      y: point.y,
    },
    {
      x: point.x,
      y: point.y + GRID_SIZE,
    },
    {
      x: point.x,
      y: point.y - GRID_SIZE,
    },
  ];

  return candidates.filter((candidate) => {
    if (!grid.has(key(candidate.x, candidate.y))) {
      return false;
    }

    return !segmentBlocked(
      point,
      candidate,
      obstacles
    );
  });
}

function findPath(start, end, obstacles) {
  const grid = buildGrid(
    start,
    end,
    obstacles
  );

  const startPoint = {
    x: snap(start.x),
    y: snap(start.y),
  };

  const endPoint = {
    x: snap(end.x),
    y: snap(end.y),
  };

  if (
    obstacles.some((obstacle) =>
      inside(startPoint, obstacle)
    ) ||
    obstacles.some((obstacle) =>
      inside(endPoint, obstacle)
    )
  ) {
    return [start, end];
  }

  grid.set(
    key(startPoint.x, startPoint.y),
    startPoint
  );

  grid.set(
    key(endPoint.x, endPoint.y),
    endPoint
  );

  const startKey = key(
    startPoint.x,
    startPoint.y
  );

  const endKey = key(
    endPoint.x,
    endPoint.y
  );

  const open = new Set([startKey]);
  const cameFrom = new Map();

  const cost = new Map();
  cost.set(startKey, 0);

  const estimated = new Map();
  estimated.set(
    startKey,
    heuristic(startPoint, endPoint)
  );

  const direction = new Map();

  while (open.size > 0) {
    let currentKey = null;
    let currentScore = Infinity;

    for (const candidate of open) {
      const score =
        estimated.get(candidate) ??
        Infinity;

      if (score < currentScore) {
        currentScore = score;
        currentKey = candidate;
      }
    }

    if (!currentKey) {
      break;
    }

    if (currentKey === endKey) {
      const result = [];

      let current = currentKey;

      while (current) {
        result.unshift(
          grid.get(current)
        );

        current = cameFrom.get(current);
      }

      return result;
    }

    open.delete(currentKey);

    const current = grid.get(currentKey);

    for (const neighbor of getNeighbors(
      current,
      grid,
      obstacles
    )) {
      const neighborKey = key(
        neighbor.x,
        neighbor.y
      );

      const previousKey =
        cameFrom.get(currentKey);

      let extraCost = GRID_SIZE;

      if (previousKey) {
        const previous =
          grid.get(previousKey);

        const previousDirection = {
          x:
            current.x -
            previous.x,
          y:
            current.y -
            previous.y,
        };

        const newDirection = {
          x:
            neighbor.x -
            current.x,
          y:
            neighbor.y -
            current.y,
        };

        if (
          previousDirection.x !==
            newDirection.x ||
          previousDirection.y !==
            newDirection.y
        ) {
          extraCost += TURN_COST;
        }
      }

      const newCost =
        (cost.get(currentKey) ?? Infinity) +
        extraCost;

      if (
        newCost <
        (cost.get(neighborKey) ?? Infinity)
      ) {
        cameFrom.set(
          neighborKey,
          currentKey
        );

        cost.set(
          neighborKey,
          newCost
        );

        estimated.set(
          neighborKey,
          newCost +
            heuristic(
              neighbor,
              endPoint
            )
        );

        direction.set(
          neighborKey,
          {
            x:
              neighbor.x -
              current.x,
            y:
              neighbor.y -
              current.y,
          }
        );

        open.add(neighborKey);
      }
    }
  }

  return [start, end];
}

function simplify(points) {
  if (points.length <= 2) {
    return points;
  }

  const result = [points[0]];

  for (
    let i = 1;
    i < points.length - 1;
    i += 1
  ) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    const sameHorizontal =
      previous.y === current.y &&
      current.y === next.y;

    const sameVertical =
      previous.x === current.x &&
      current.x === next.x;

    if (
      sameHorizontal ||
      sameVertical
    ) {
      continue;
    }

    result.push(current);
  }

  result.push(
    points[points.length - 1]
  );

  return result;
}

function pathToSvg(points) {
  if (!points.length) {
    return "";
  }

  return points
    .map((point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `L ${point.x} ${point.y}`
    )
    .join(" ");
}

export default function CircuitEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  interactionWidth,
  style,
}) {
  const nodes = useNodes();

  const obstacles = nodes
    .filter(
      (node) =>
        node.id !== source &&
        node.id !== target &&
        node.type !== "junction"
    )
    .map((node) => {
      const width =
        node.measured?.width ??
        node.width ??
        360;

      const height =
        node.measured?.height ??
        node.height ??
        120;

      return {
        left:
          node.position.x -
          CLEARANCE,

        top:
          node.position.y -
          CLEARANCE,

        right:
          node.position.x +
          width +
          CLEARANCE,

        bottom:
          node.position.y +
          height +
          CLEARANCE,
      };
    });

  const sourceDirection =
    directionVector(sourcePosition);

  const targetDirection =
    directionVector(targetPosition);

  const start = {
    x:
      sourceX +
      sourceDirection.x *
        CLEARANCE,

    y:
      sourceY +
      sourceDirection.y *
        CLEARANCE,
  };

  const end = {
    x:
      targetX +
      targetDirection.x *
        CLEARANCE,

    y:
      targetY +
      targetDirection.y *
        CLEARANCE,
  };

  const gridPath = findPath(
    start,
    end,
    obstacles
  );

  const points = simplify([
    { x: sourceX, y: sourceY },
    ...gridPath,
    { x: targetX, y: targetY },
  ]);

  const edgePath =
    pathToSvg(points);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
      style={{
        strokeWidth: 1.5,
        ...style,
      }}
    />
  );
}
