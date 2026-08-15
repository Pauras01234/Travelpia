/**
 * Unauthenticated auth endpoints: login, signup, refresh, logout.
 *
 * These deliberately do NOT go through `@/api/client`: that client resolves a
 * session token for every request, and routing refresh through it would
 * recurse (refresh -> needs token -> refresh -> ...). Everything else in the
 * app should use `@/api/client`, which handles auth and 401s automatically.
 */

const NETWORK_ERROR_MESSAGE = "Something went wrong. Please try again.";

function getBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set");
  }
  return base;
}

export type Plan = "free" | "premium";

export type LoginUser = {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  /** Entitlement tier. Older backends omit it; treated as "free". */
  plan?: Plan;
};

export type LoginSuccess = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: LoginUser;
};

/** Reads the backend's `detail` message, falling back to a safe default. */
async function readDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.length > 0) {
      return body.detail;
    }
  } catch {
    // Non-JSON body (e.g. a gateway error page) — keep the fallback.
  }
  return fallback;
}

type PostOutcome =
  | { status: "ok"; response: Response }
  | { status: "offline" };

/** POSTs JSON, turning a transport failure into a value rather than a throw. */
async function postJson(path: string, body: unknown): Promise<PostOutcome> {
  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: "ok", response };
  } catch {
    return { status: "offline" };
  }
}

export type LoginResult =
  | { ok: true; data: LoginSuccess }
  | { ok: false; kind: "unauthorized"; detail: string }
  | { ok: false; kind: "unavailable"; message: string };

export async function loginRequest(
  email: string,
  phone: string,
  password: string,
): Promise<LoginResult> {
  const outcome = await postJson("/auth/login", { email, phone, password });
  if (outcome.status === "offline") {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }

  const { response } = outcome;
  if (response.status === 401) {
    return {
      ok: false,
      kind: "unauthorized",
      detail: await readDetail(response, "Invalid email, phone, or password"),
    };
  }
  if (!response.ok) {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }

  try {
    return { ok: true, data: (await response.json()) as LoginSuccess };
  } catch {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }
}

export type SignupResult =
  | { ok: true; data: LoginSuccess }
  | { ok: false; kind: "conflict"; detail: string }
  | { ok: false; kind: "unavailable"; message: string };

export async function signupRequest(
  email: string,
  phone: string,
  password: string,
  fullName?: string | null,
): Promise<SignupResult> {
  const payload: Record<string, string> = { email, phone, password };
  if (fullName && fullName.trim().length > 0) {
    payload.full_name = fullName.trim();
  }

  const outcome = await postJson("/auth/signup", payload);
  if (outcome.status === "offline") {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }

  const { response } = outcome;
  if (response.status === 409) {
    return {
      ok: false,
      kind: "conflict",
      detail: await readDetail(response, "Unable to create account"),
    };
  }
  if (!response.ok) {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }

  try {
    return { ok: true, data: (await response.json()) as LoginSuccess };
  } catch {
    return { ok: false, kind: "unavailable", message: NETWORK_ERROR_MESSAGE };
  }
}

export type RefreshResult =
  | { ok: true; data: LoginSuccess }
  /** The refresh token was rejected — the session cannot be recovered. */
  | { ok: false; kind: "expired" }
  /** Offline or the auth service is down — the session may still be fine. */
  | { ok: false; kind: "unavailable" };

/**
 * Exchange a refresh token for a fresh session.
 *
 * The two failure kinds are load-bearing: "expired" must sign the user out,
 * "unavailable" must not (a flaky network should never end a session).
 */
export async function refreshRequest(
  refreshToken: string,
): Promise<RefreshResult> {
  const outcome = await postJson("/auth/refresh", {
    refresh_token: refreshToken,
  });
  if (outcome.status === "offline") {
    return { ok: false, kind: "unavailable" };
  }

  const { response } = outcome;
  if (response.status === 401) {
    return { ok: false, kind: "expired" };
  }
  if (!response.ok) {
    return { ok: false, kind: "unavailable" };
  }

  try {
    return { ok: true, data: (await response.json()) as LoginSuccess };
  } catch {
    return { ok: false, kind: "unavailable" };
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

export { NETWORK_ERROR_MESSAGE };
