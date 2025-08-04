import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getFullUrl(url: string): string {
  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it starts with /api, use the API base URL
  if (url.startsWith('/api')) {
    return `${API_BASE_URL}${url}`;
  }
  
  // Otherwise, assume it's a relative API path and prepend /api
  return `${API_BASE_URL}/api${url.startsWith('/') ? url : '/' + url}`;
}

function getAuthHeaders() {
  const headers: Record<string, string> = {};
  
  // Get token from localStorage (set by AuthContext)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const fullUrl = getFullUrl(url);
  
  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    credentials: 'include', // Important for cross-origin cookies/sessions
    body: data ? JSON.stringify(data) : undefined,
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
    const authHeaders = getAuthHeaders();
    const fullUrl = getFullUrl(queryKey[0] as string);
    
    const res = await fetch(fullUrl, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      credentials: 'include', // Important for cross-origin cookies/sessions
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Clear invalid token on 401
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
      }
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
