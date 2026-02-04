/**
 * Centralized Air Quality Logic
 * Standard: 'primary' (EU) or 'secondary' (US)
 */

export const getPollutantSeverity = (label, value, max, standard) => {
    const isUS = standard === "secondary";
    const labelStr = label.toString();

    // --- 1. OVERALL AQI SCALE ---
    if (labelStr.includes("AQI") || labelStr.includes("Index")) {
        if (isUS) {
            // US EPA 6-Stage Scale
            if (value > 300) return { label: "Hazardous", color: "#7F1D1D", textClass: "text-red-900", bgClass: "bg-red-900/20", borderClass: "border-red-900/30" };
            if (value > 200) return { label: "Very Unhealthy", color: "#A855F7", textClass: "text-purple-400", bgClass: "bg-purple-400/10", borderClass: "border-purple-400/20" };
            if (value > 150) return { label: "Unhealthy", color: "#FB7185", textClass: "text-rose-400", bgClass: "bg-rose-400/10", borderClass: "border-rose-400/20" };
            if (value > 100) return { label: "Unhealthy (SG)", color: "#F97316", textClass: "text-orange-400", bgClass: "bg-orange-400/10", borderClass: "border-orange-400/20" };
            if (value > 50) return { label: "Moderate", color: "#FBBF24", textClass: "text-amber-400", bgClass: "bg-amber-400/10", borderClass: "border-amber-400/20" };
            return { label: "Good", color: "#10B981", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", borderClass: "border-emerald-400/20" };
        } else {
            // EU EEA 5-Stage Scale
            if (value > 80) return { label: "Very Poor", color: "#FB7185", textClass: "text-rose-400", bgClass: "bg-rose-400/10", borderClass: "border-rose-400/20" };
            if (value > 60) return { label: "Poor", color: "#F97316", textClass: "text-orange-400", bgClass: "bg-orange-400/10", borderClass: "border-orange-400/20" };
            if (value > 40) return { label: "Fair", color: "#FBBF24", textClass: "text-amber-400", bgClass: "bg-amber-400/10", borderClass: "border-amber-400/20" };
            if (value > 20) return { label: "Moderate", color: "#34D399", textClass: "text-emerald-300", bgClass: "bg-emerald-300/10", borderClass: "border-emerald-300/20" };
            return { label: "Good", color: "#10B981", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", borderClass: "border-emerald-400/20" };
        }
    }

    // --- 2. FINE PARTICLES (PM2.5) SCALE ---
    if (labelStr.includes("2.5")) {
        // EPA defines Moderate at 12.1 µg/m³
        const mod = isUS ? 12 : 20;
        const high = isUS ? 35 : 50;
        if (value > high) return { label: "High", color: "#FB7185", textClass: "text-rose-400", bgClass: "bg-rose-400/10", borderClass: "border-rose-400/20" };
        if (value > mod) return { label: "Moderate", color: "#FBBF24", textClass: "text-amber-400", bgClass: "bg-amber-400/10", borderClass: "border-amber-400/20" };
        return { label: "Normal", color: "#10B981", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", borderClass: "border-emerald-400/20" };
    }

    // --- 3. NITROGEN DIOXIDE (NO2) SCALE ---
    if (labelStr.includes("NO")) {
        // EU hourly limit is 200, but health concerns start lower
        if (value > 150) return { label: "High", color: "#FB7185", textClass: "text-rose-400", bgClass: "bg-rose-400/10", borderClass: "border-rose-400/20" };
        if (value > 40) return { label: "Moderate", color: "#FBBF24", textClass: "text-amber-400", bgClass: "bg-amber-400/10", borderClass: "border-amber-400/20" };
        return { label: "Normal", color: "#10B981", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", borderClass: "border-emerald-400/20" };
    }

    // --- 4. CARBON MONOXIDE (CO) SCALE ---
    if (labelStr.includes("CO")) {
        // CO is measured in thousands. EPA Moderate is roughly 4.5 ppm (~5000 µg/m³)
        if (value > 10000) return { label: "High", color: "#FB7185", textClass: "text-rose-400", bgClass: "bg-rose-400/10", borderClass: "border-rose-400/20" };
        if (value > 4000) return { label: "Moderate", color: "#FBBF24", textClass: "text-amber-400", bgClass: "bg-amber-400/10", borderClass: "border-amber-400/20" };
        return { label: "Normal", color: "#10B981", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", borderClass: "border-emerald-400/20" };
    }

    // --- 5. FALLBACK (Percentage) ---
    const p = (value / max) * 100;
    if (p > 80) return { label: "High", color: "#FB7185", textClass: "text-rose-400", bgClass: "bg-rose-400/10", borderClass: "border-rose-400/20" };
    if (p > 40) return { label: "Moderate", color: "#FBBF24", textClass: "text-amber-400", bgClass: "bg-amber-400/10", borderClass: "border-amber-400/20" };
    return { label: "Normal", color: "#10B981", textClass: "text-emerald-400", bgClass: "bg-emerald-400/10", borderClass: "border-emerald-400/20" };
};