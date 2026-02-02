export default function CityModal({
    isOpen,
    cities,
    selectedCity,
    onSelect,
    onClose,
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-3xl p-6 animate-scale-in w-full max-w-sm shadow-lg">

                <h3 className="text-lg font-semibold mb-4">
                    Select city
                </h3>

                <div className="space-y-2">
                    {cities.map((c) => (
                        <button
                            key={c.name}
                            onClick={() => onSelect(c)}
                            className={`w-full text-left px-4 py-3 rounded-xl border
                                ${selectedCity.name === c.name
                                    ? "border-blue-500 bg-blue-50 text-blue-700 flex items-center justify-between"
                                    : "border-slate-200 hover:bg-slate-100"
                                }`}
                        >
                            <span>{c.name}</span>
                            {selectedCity.name === c.name && (
                                <span className="text-blue-600">✓</span>
                            )}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
                >
                    Cancel
                </button>

            </div>
        </div>
    );
}
