import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../../../lib/api";

const EMPTY_AVAILABILITY = {
    reserved: [],
    free: [],
    full: [],
    noedit: [],
};

function normalizeAvailability(data) {
    return {
        reserved: Array.isArray(data?.reserved) ? data.reserved : [],
        free: Array.isArray(data?.free) ? data.free : [],
        full: Array.isArray(data?.full) ? data.full : [],
        noedit: Array.isArray(data?.noedit) ? data.noedit : [],
    };
}

function getCacheKey(email, viewedDate) {
    return [
        "parkpro-calendar",
        email,
        viewedDate.getFullYear(),
        viewedDate.getMonth() + 1,
    ].join("_");
}

export default function useCalendarData(email, viewedDate) {
    const [availability, setAvailability] = useState(EMPTY_AVAILABILITY);
    const [snipingDates, setSnipingDates] = useState([]);
    const [activePlate, setActivePlate] = useState("");
    const [loading, setLoading] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState(null);
    const [error, setError] = useState(null);

    const availabilityAbortRef = useRef(null);
    const requestIdRef = useRef(0);

    const loadAvailability = useCallback(
        async (force = false) => {
            if (!email) return;

            const cacheKey = getCacheKey(email, viewedDate);
            const cached = sessionStorage.getItem(cacheKey);

            if (cached && !force) {
                try {
                    const parsed = JSON.parse(cached);

                    const cachedAvailability = normalizeAvailability(
                        parsed.availability
                    );

                    setAvailability(cachedAvailability);

                    if (parsed.timestamp) {
                        setLastSyncedAt(parsed.timestamp);
                    }

                    const age = Date.now() - Number(parsed.timestamp || 0);

                    if (age < 5 * 60 * 1000) {
                        setLoading(false);
                        return;
                    }
                } catch {
                    sessionStorage.removeItem(cacheKey);
                }
            }

            if (availabilityAbortRef.current) {
                availabilityAbortRef.current.abort();
            }

            const controller = new AbortController();
            availabilityAbortRef.current = controller;

            const requestId = ++requestIdRef.current;

            setLoading(true);
            setError(null);

            try {
                const month = viewedDate.getMonth() + 1;
                const year = viewedDate.getFullYear();

                const response = await apiFetch(
                    `/api/availability?month=${month}&year=${year}&email=${encodeURIComponent(
                        email
                    )}`,
                    {
                        signal: controller.signal,
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    throw new Error("NOT_AUTHORIZED");
                }

                if (!response.ok) {
                    throw new Error(
                        `Availability request failed (${response.status})`
                    );
                }

                const data = await response.json();
                const normalized = normalizeAvailability(data);
                const timestamp = Date.now();

                if (requestId !== requestIdRef.current) {
                    return;
                }

                setAvailability(normalized);
                setLastSyncedAt(timestamp);

                sessionStorage.setItem(
                    cacheKey,
                    JSON.stringify({
                        availability: normalized,
                        timestamp,
                    })
                );

                if (data.activePlate) {
                    setActivePlate(data.activePlate);
                }
            } catch (err) {
                if (err.name === "AbortError") {
                    return;
                }

                console.error("Calendar availability error:", err);
                setError(err.message || "Failed to load availability");
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        },
        [email, viewedDate]
    );

    const loadPlate = useCallback(async () => {
        if (!email) return;

        try {
            const response = await apiFetch("/api/plate");

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            if (data.success) {
                setActivePlate(data.activePlate || "");
            }
        } catch (err) {
            console.error("Failed to load active plate:", err);
        }
    }, [email]);

    const loadActiveSnipers = useCallback(async () => {
        if (!email) return;

        try {
            const response = await apiFetch(
                `/api/sniper/active?email=${encodeURIComponent(email)}`
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            setSnipingDates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load active snipers:", err);
        }
    }, [email]);

    useEffect(() => {
        if (!email) {
            setAvailability(EMPTY_AVAILABILITY);
            setSnipingDates([]);
            setActivePlate("");
            setLastSyncedAt(null);
            setError(null);
            return;
        }

        loadPlate();
    }, [email, loadPlate]);

    useEffect(() => {
        if (!email) return;

        loadAvailability(false);
        loadActiveSnipers();

        const availabilityInterval = setInterval(() => {
            loadAvailability(true);
        }, 5 * 60 * 1000);

        const sniperInterval = setInterval(() => {
            loadActiveSnipers();
        }, 10 * 1000);

        return () => {
            clearInterval(availabilityInterval);
            clearInterval(sniperInterval);

            if (availabilityAbortRef.current) {
                availabilityAbortRef.current.abort();
            }
        };
    }, [email, loadAvailability, loadActiveSnipers]);

    return {
        availability,
        snipingDates,
        activePlate,
        loading,
        lastSyncedAt,
        error,

        refresh: () => loadAvailability(true),

        refreshSnipers: () => loadActiveSnipers(),
    };
}