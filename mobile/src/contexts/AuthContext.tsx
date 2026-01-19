import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "../../../shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { secureStorage } from "../lib/secureStorage";
import AlertDialog from "../../components/AlertDialog";
import { Ionicons } from "@expo/vector-icons";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
};

type LoginData = {
  email: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [cachedUser, setCachedUser] = useState<User | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({ visible: false });

  // Load auth token from SecureStore on app start
  useEffect(() => {
    const loadAuthToken = async () => {
      try {
        const token = await secureStorage.getAuthToken();
        if (token) {
          setHasToken(true);
        }
      } catch (error) {
        // Silently handle error
      }
      // Small delay to ensure token is in memory before queries run
      setTimeout(() => setIsInitialized(true), 50);
    };
    loadAuthToken();
  }, []);

  const {
    data: user,
    error,
    isLoading,
    isFetching,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isInitialized,
    retry: false, // Don't retry on 401
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (previously cacheTime)
  });


  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (userData: User & { token?: string }) => {
      const { token, ...user } = userData;
      queryClient.setQueryData(["/api/user"], user);
      setCachedUser(user);
      // Save JWT token for persistent login
      if (token) {
        try {
          await secureStorage.saveAuthToken(token);
        } catch (error) {
          // Silently handle error
        }
      }
    },
    onError: (error: Error) => {
      setAlertConfig({
        visible: true,
        title: "Login Failed",
        message: error.message,
        icon: "alert-circle",
        iconColor: "#FF3B30",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: async (userData: User & { token?: string }) => {
      const { token, ...user } = userData;
      queryClient.setQueryData(["/api/user"], user);
      setCachedUser(user);
      // Save JWT token for persistent login
      if (token) {
        try {
          await secureStorage.saveAuthToken(token);
        } catch (error) {
          // Silently handle error
        }
      }
    },
    onError: (error: Error) => {
      setAlertConfig({
        visible: true,
        title: "Registration Failed",
        message: error.message,
        icon: "alert-circle",
        iconColor: "#FF3B30",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: async () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      setCachedUser(null);
      // Clear auth token from SecureStore
      try {
        await secureStorage.deleteAuthToken();
      } catch (error) {
        // Silently handle error
      }
    },
    onError: (error: Error) => {
      setAlertConfig({
        visible: true,
        title: "Logout Failed",
        message: error.message,
        icon: "alert-circle",
        iconColor: "#FF3B30",
      });
    },
  });

  // Use cached user as fallback when server hasn't responded yet
  const effectiveUser = user ?? cachedUser;

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        isLoading: !isInitialized || (isLoading && isFetching && !cachedUser),
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}

      {/* Custom Alert Dialog */}
      <AlertDialog
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        buttons={[{ text: "OK" }]}
        onDismiss={() => setAlertConfig({ visible: false })}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
