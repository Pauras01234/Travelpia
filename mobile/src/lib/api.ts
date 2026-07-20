const NETWORK_ERROR_MESSAGE =
  "Something went wrong. Please try again.";

function getBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");
  }
  return base;
}

export type LoginUser = {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
};

export type LoginSuccess = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: LoginUser;
};

export type LoginResult =
  | { ok: true; data: LoginSuccess }
  | { ok: false; kind: "unauthorized"; detail: string }
  | { ok: false; kind: "unavailable"; message: string };

export async function loginRequest(
  email: string,
  phone: string,
  password: string,
): Promise<LoginResult> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, password }),
    });
  } catch {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }

  if (response.status === 401) {
    let detail = "Invalid email, phone, or password";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string" && body.detail.length > 0) {
        detail = body.detail;
      }
    } catch {
      // Keep fallback if body isn't JSON.
    }
    return { ok: false, kind: "unauthorized", detail };
  }

  if (!response.ok) {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }

  try {
    const data = (await response.json()) as LoginSuccess;
    return { ok: true, data };
  } catch {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }
}

export async function logoutRequest(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const response = await fetch(`${getBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Logout failed with status ${response.status}`);
  }
}

/** Authenticated fetch: on 401, clears local session via the provided callback. */
export async function apiFetch(
  path: string,
  options: RequestInit & { accessToken: string },
  onUnauthorized: () => void | Promise<void>,
): Promise<Response> {
  const { accessToken, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    throw error;
  }

  if (response.status === 401) {
    await onUnauthorized();
  }

  return response;
}

export { NETWORK_ERROR_MESSAGE };
