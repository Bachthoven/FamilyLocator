import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  console.log('useAuth hook state:', { user: !!user, isLoading });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
