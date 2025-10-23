import {
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
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({ visible: false });

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

  useEffect(() => {
    setIsInitialized(true);
  }, []);

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
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
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
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
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
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
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

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: !isInitialized || (isLoading && isFetching),
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
