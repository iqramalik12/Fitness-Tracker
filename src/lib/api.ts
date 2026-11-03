// Browser-side helper for the app's own API. Sends the session token when there is one
// and turns error responses into exceptions carrying the server's message.

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export const getToken = () => localStorage.getItem("pulse_auth_token");
export const isSignedIn = () => Boolean(getToken());

export async function api<T = any>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = res.status === 401 || res.status === 403
      ? "Please sign in again to use this feature."
      : data.error || `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// Local date/time parts used for reminders (reminder times are in the user's own time zone)
export function localClock() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    localTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    localDate: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    weekday: now.getDay(),
  };
}
