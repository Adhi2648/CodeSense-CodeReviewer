import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  githubId: string;
  username: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export const useAuth = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => api.get<AuthUser | null>("/api/auth/me")
  });

  const logoutMutation = useMutation({
    mutationFn: async () => api.post<{ ok: boolean }>("/api/auth/logout"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    }
  });

  return useMemo(
    () => ({
      user: query.data ?? null,
      isLoading: query.isLoading,
      isAuthenticated: Boolean(query.data),
      logout: async (): Promise<void> => {
        await logoutMutation.mutateAsync();
      }
    }),
    [query.data, query.isLoading, logoutMutation]
  );
};
