import MapEngine from "../../../engine/components/MapEngine";
import MapHUD from "./MapHUD";

export default function MapLayout(props) {
    return (
        <div className="fixed inset-0 bg-black overflow-hidden">
            {/* MAP */}
            <div className="absolute inset-0 z-0">
                <MapEngine />
            </div>

            {/* HUD */}
            <MapHUD {...props} />
        </div>
    );
}
