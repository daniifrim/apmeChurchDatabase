// Legacy hook - redirects to new AuthContext
// This maintains compatibility with existing components
import { useAuth as useAuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  const { user, loading } = useAuthContext();

  return {
    user,
    isLoading: loading,
    isAuthenticated: !!user,
  };
}
