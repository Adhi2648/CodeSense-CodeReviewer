import { ApiResponse } from "@codesense/shared";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface RequestOptions extends RequestInit {
  body?: unknown;
}

const request = async <T>(path: string, options?: RequestOptions): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    },
    credentials: "include",
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
    const message = payload?.error?.error ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" })
};
