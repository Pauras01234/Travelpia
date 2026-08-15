/** Profile mutations for the Settings screen. */
import { apiFetch } from "@/api/client";
import type { Profile } from "@/features/profile/ProfileContext";

/** Update the signed-in user's display name. Returns the updated profile. */
export async function updateUsername(fullName: string): Promise<Profile> {
  return apiFetch<Profile>("/auth/me", {
    method: "PATCH",
    body: { full_name: fullName },
  });
}
