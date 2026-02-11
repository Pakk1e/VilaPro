import { useNavigate } from "react-router-dom";

export default function MapExitButton() {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate("/weather")}
            className="bg-[#0F172A]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white"
        >
            Exit Map
        </button>
    );
}
