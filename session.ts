import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./api";
import type { AdminStatus, SessionUser } from "./types";

export const USER_SESSION_KEY = ["session", "user"] as const;
export const ADMIN_SESSION_KEY = ["session", "admin"] as const;

export function useUserSession(): UseQueryResult<SessionUser> {
  return useQuery({
    queryKey: USER_SESSION_KEY,
    queryFn: () => apiGet<SessionUser>("/auth/me"),
    staleTime: 60_000,
    retry: false,
  });
}

export function useAdminSession(): UseQueryResult<AdminStatus> {
  return useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: () => apiGet<AdminStatus>("/admin/session"),
    staleTime: 60_000,
    retry: false,
  });
}

// Route every sign-out through here: clearing the whole query cache stops the
// previous account's cached data from rendering for the next login.
export async function endUserSession(queryClient: QueryClient): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } finally {
    queryClient.clear();
  }
}

export async function endAdminSession(queryClient: QueryClient): Promise<void> {
  try {
    await apiPost("/admin/logout");
  } finally {
    queryClient.clear();
  }
}
