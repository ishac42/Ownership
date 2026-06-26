const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Avoid //api/... when VITE_API_URL has a trailing slash (e.g. Render env vars).
export const API_BASE_URL = rawApiUrl.replace(/\/$/, '');
