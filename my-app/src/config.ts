const trimTrailingSlash = (url: string) => url.replace(/\/$/, '');

/** In dev, default to same-origin `/api` (Vite proxies to localhost:3001). */
export const API_BASE_URL = (() => {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (configured !== undefined && String(configured).trim() !== '') {
    return trimTrailingSlash(String(configured).trim());
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return 'http://localhost:3001';
})();
