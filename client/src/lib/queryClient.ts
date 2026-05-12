import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

/**
 * API Base URL - When running as a native Capacitor app (iOS/Android),
 * relative URLs like /api/... resolve to capacitor://localhost/api/...
 * which doesn't reach the backend. We need absolute URLs in native mode.
 */
const RAILWAY_URL = "https://web-production-cce91.up.railway.app";

export function getApiUrl(path: string): string {
  // Already absolute URL - return as-is
  if (path.startsWith("http")) return path;
  // In native Capacitor app, prefix with Railway URL
  if (Capacitor.isNativePlatform()) {
    return `${RAILWAY_URL}${path}`;
  }
  // In browser/web mode, use relative URL
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use credentials "include" for same-origin, "omit" for cross-origin (Railway)
  const resolvedUrl = getApiUrl(url);
  const isNative = Capacitor.isNativePlatform();
  const res = await fetch(resolvedUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: isNative ? "omit" : "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = getApiUrl(queryKey.join("/") as string);
    const isNative = Capacitor.isNativePlatform();
    const res = await fetch(url, {
      credentials: isNative ? "omit" : "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: 2,
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
