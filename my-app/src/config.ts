/** Dev: Vite proxy (`/api` → localhost:3001). Prod: set VITE_API_URL at build time. */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? '' : 'https://ownership-srl2.onrender.com');
