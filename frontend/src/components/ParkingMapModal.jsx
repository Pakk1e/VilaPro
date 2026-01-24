import React from "react";
import ParkingMapSvg from "./ParkingMapSvg";

export default function ParkingMapModal({
  isOpen,
  onClose,
  spotName,
  dateLabel,
}) {
  const [zoomScale, setZoomScale] = React.useState(1);
  const [zoomOffset, setZoomOffset] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (isOpen) {
      setZoomScale(1);
      setZoomOffset({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isViewModified =
    zoomScale !== 1 ||
    zoomOffset.x !== 0 ||
    zoomOffset.y !== 0;

  function resetView() {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
  }

  return (
    <div className="fixed inset-0 z-50 hidden lg:flex items-center justify-center">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative z-10 w-[90%] max-w-5xl bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Parking Map
              </h2>
              <div className="mt-2 space-y-1 text-sm text-slate-600 font-medium">
                <div>
                  <span className="text-slate-400">Reserved date:</span> {dateLabel}
                </div>
                <div>
                  <span className="text-slate-400">Reserved spot:</span> {spotName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isViewModified && (
                <button
                  onClick={resetView}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg
                 border border-slate-200 bg-white
                 hover:bg-slate-100 transition"
                >
                  Reset View
                </button>
              )}

              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

          </div>
        </div>


        {/* MAP BODY */}
        <div className="p-6 h-[70vh]">
          <ParkingMapSvg
            highlightedSpot={spotName}
            zoomScale={zoomScale}
            setZoomScale={setZoomScale}
            zoomOffset={zoomOffset}
            setZoomOffset={setZoomOffset}
          />
        </div>
      </div>
    </div>
  );
}
