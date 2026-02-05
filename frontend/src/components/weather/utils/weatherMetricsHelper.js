// helpers.js or top of component
export const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
        case 'high':
            return { color: '#F43F5E', bgClass: 'bg-rose-500/20 text-rose-400 border-rose-500/20' };
        case 'moderate':
        case 'partial':
            return { color: '#FBBF24', bgClass: 'bg-amber-500/20 text-amber-400 border-amber-500/20' };
        case 'low':
        case 'clear':
        case 'steady':
        default:
            return { color: '#2DD4BF', bgClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' };
    }
};