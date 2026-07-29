import { API_BASE_URL } from '../config';

const DEFAULT_TIMEOUT_MS = 45_000;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** POST/GET helper with timeout — avoids infinite "Fetching..." when backend is down. */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiRequestError(
        'The server did not respond in time. The API may be starting up or unavailable — try again in a minute.',
        error
      );
    }
    throw new ApiRequestError(
      'Could not reach the ownership API. Check your connection or contact support if this persists.',
      error
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function apiPostJson<T = unknown>(
  path: string,
  body: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const response = await apiFetch(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    timeoutMs
  );

  const json = (await response.json()) as T & { success?: boolean; error?: string };

  if (!response.ok) {
    const message =
      (json as { error?: string }).error ||
      (json as { message?: string }).message ||
      `Server returned ${response.status}`;
    throw new ApiRequestError(message);
  }

  if (json.success === false) {
    throw new ApiRequestError(
      (json as { error?: string }).error || 'The server rejected the request.'
    );
  }

  return json;
}
