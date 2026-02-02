import countries from "./countries.json";

/**
 * Finds country details based on Alpha-3 code (e.g., "SVK")
 * @param {string} code - The code from your weather/geo API
 */
export const getCountryDetails = (code) => {
    if (!code) return null;

    // Normalize code to uppercase to match JSON
    const searchCode = code.toUpperCase();

    const country = countries.find(c => c["alpha-3"] === searchCode);

    if (country) {
        return {
            fullName: country.name,
            numericCode: country["country-code"],
            // If you need Alpha-2 for flags (e.g., "SK"), 
            // most APIs use the first two letters of Alpha-3 or a map
            shortCode: country["alpha-3"].substring(0, 2)
        };
    }

    return { fullName: code, shortCode: code }; // Fallback
};