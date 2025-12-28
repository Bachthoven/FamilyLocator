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
import * as SecureStore from "expo-secure-store";
import { User, InsertUser } from "../../../shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import AlertDialog from "../../components/AlertDialog";
import { Ionicons } from "@expo/vector-icons";

const USER_STORAGE_KEY = "familylocator_user";

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
  const [cachedUser, setCachedUser] = useState<User | null>(null);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({ visible: false });

  // Load cached user from SecureStore on app start
  useEffect(() => {
    const loadCachedUser = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync(USER_STORAGE_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setCachedUser(parsedUser);
          // Pre-populate the query cache with cached user
          queryClient.setQueryData(["/api/user"], parsedUser);
        }
      } catch (error) {
        console.log("Error loading cached user:", error);
      }
      setIsInitialized(true);
    };
    loadCachedUser();
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

  // Debug logging
  useEffect(() => {
    if (__DEV__) {
      console.log("[AuthContext] isInitialized:", isInitialized);
      console.log("[AuthContext] isLoading:", isLoading);
      console.log("[AuthContext] isFetching:", isFetching);
      console.log("[AuthContext] user:", user);
      console.log("[AuthContext] error:", error);
    }
  }, [isInitialized, isLoading, isFetching, user, error]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setCachedUser(user);
      // Save user to SecureStore for persistent login
      try {
        await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
      } catch (error) {
        console.log("Error saving user to storage:", error);
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
    onSuccess: async (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      setCachedUser(user);
      // Save user to SecureStore for persistent login
      try {
        await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));
      } catch (error) {
        console.log("Error saving user to storage:", error);
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
      // Clear user from SecureStore
      try {
        await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
      } catch (error) {
        console.log("Error clearing user from storage:", error);
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
