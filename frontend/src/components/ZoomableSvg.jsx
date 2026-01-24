import React from "react";

export default function ZoomableSvg({
    width,
    height,
    children,
    scale,
    setScale,
    offset,
    setOffset,
}) {
    const svgRef = React.useRef(null);
    const isDraggingRef = React.useRef(false);
    const lastSvgPoint = React.useRef(null);

    function getSvgPoint(evt) {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }


    function handleWheel(e) {
        e.preventDefault();

        const zoomSpeed = 0.08;
        const direction = e.deltaY > 0 ? -1 : 1;
        const newScale = Math.min(3, Math.max(1, scale + direction * zoomSpeed));

        if (newScale === scale) return;

        const mouse = getSvgPoint(e);

        setOffset(prev => ({
            x: mouse.x - (mouse.x - prev.x) * (newScale / scale),
            y: mouse.y - (mouse.y - prev.y) * (newScale / scale),
        }));

        setScale(newScale);
    }

    function handlePointerDown(e) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        isDraggingRef.current = true;
        lastSvgPoint.current = getSvgPoint(e);
    }

    function handlePointerMove(e) {
        if (!isDraggingRef.current || !lastSvgPoint.current) return;

        const currentPoint = getSvgPoint(e);

        const dx = currentPoint.x - lastSvgPoint.current.x;
        const dy = currentPoint.y - lastSvgPoint.current.y;

        lastSvgPoint.current = currentPoint;

        setOffset(prev => {
            const marginX = width * 0.25;
            const marginY = height * 0.25;

            const scaledWidth = width * scale;
            const scaledHeight = height * scale;

            return {
                x: clamp(
                    prev.x + dx,
                    width - scaledWidth - marginX, // right bound
                    marginX                        // left bound
                ),
                y: clamp(
                    prev.y + dy,
                    height - scaledHeight - marginY, // bottom bound
                    marginY                          // top bound
                ),
            };
        });

    }

    function handlePointerUp(e) {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch { }

        isDraggingRef.current = false;
        lastSvgPoint.current = null;
    }

    React.useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        svg.addEventListener("wheel", handleWheel, { passive: false });

        return () => {
            svg.removeEventListener("wheel", handleWheel);
        };
    }, [scale]);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="100%"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
                cursor: isDraggingRef.current ? "grabbing" : "grab",
                touchAction: "none",
                overscrollBehavior: "none",
            }}
        >
            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
                {children}
            </g>
        </svg>
    );
}
