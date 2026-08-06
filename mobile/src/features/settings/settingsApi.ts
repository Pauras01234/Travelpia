/** Profile mutations for the Settings screen. */
import type { Profile } from "@/features/profile/useProfile";
import { apiFetch } from "@/lib/api";
import { getTokens } from "@/lib/session";

/** Update the signed-in user's display name. Returns the updated profile. */
export async function updateUsername(
  fullName: string,
  onUnauthorized: () => void | Promise<void>,
): Promise<Profile> {
  const tokens = await getTokens();
  if (!tokens) throw new Error("You're not signed in.");

  const res = await apiFetch(
    "/auth/me",
    {
      method: "PATCH",
      accessToken: tokens.accessToken,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    },
    onUnauthorized,
  );

  if (!res.ok) {
    throw new Error("Couldn't save your changes. Please try again.");
  }
  return (await res.json()) as Profile;
}
