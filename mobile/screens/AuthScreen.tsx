import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";

type TabType = "login" | "register";

export default function AuthScreen() {
  const { loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerErrors, setRegisterErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)]+$/;
    return phone.length >= 10 && phoneRegex.test(phone);
  };

  const handleLogin = () => {
    const errors: { email?: string; password?: string } = {};

    if (!loginEmail) {
      errors.email = "Email is required";
    } else if (!validateEmail(loginEmail)) {
      errors.email = "Please enter a valid email";
    }

    if (!loginPassword) {
      errors.password = "Password is required";
    } else if (loginPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setLoginErrors(errors);

    if (Object.keys(errors).length === 0) {
      loginMutation.mutate({
        email: loginEmail,
        password: loginPassword,
      });
    }
  };

  const handleRegister = () => {
    const errors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!registerFirstName) {
      errors.firstName = "First name is required";
    }

    if (!registerLastName) {
      errors.lastName = "Last name is required";
    }

    if (!registerEmail) {
      errors.email = "Email is required";
    } else if (!validateEmail(registerEmail)) {
      errors.email = "Please enter a valid email";
    }

    if (!registerPhone) {
      errors.phoneNumber = "Phone number is required";
    } else if (!validatePhone(registerPhone)) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    if (!registerPassword) {
      errors.password = "Password is required";
    } else if (registerPassword.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!registerConfirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (registerPassword !== registerConfirmPassword) {
      errors.confirmPassword = "Passwords don't match";
    }

    setRegisterErrors(errors);

    if (Object.keys(errors).length === 0) {
      registerMutation.mutate({
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        phoneNumber: registerPhone,
        profileImageUrl: null,
        locationSharingEnabled: true,
        locationHistoryEnabled: true,
        notificationsEnabled: true,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>FamilyLocator</Text>
            <Text style={styles.subtitle}>Stay connected with your family</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "login" && styles.activeTab]}
              onPress={() => setActiveTab("login")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "login" && styles.activeTabText,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "register" && styles.activeTab]}
              onPress={() => setActiveTab("register")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "register" && styles.activeTabText,
                ]}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Card */}
          <View style={styles.card}>
            {activeTab === "login" ? (
              <View style={styles.formContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Welcome back</Text>
                  <Text style={styles.cardDescription}>
                    Sign in to your account to continue
                  </Text>
                </View>

                <View style={styles.form}>
                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={[
                        styles.input,
                        loginErrors.email && styles.inputError,
                      ]}
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {loginErrors.email && (
                      <Text style={styles.errorText}>{loginErrors.email}</Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          loginErrors.password && styles.inputError,
                        ]}
                        placeholder="Enter password"
                        value={loginPassword}
                        onChangeText={setLoginPassword}
                        secureTextEntry={!showLoginPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        <Ionicons
                          name={showLoginPassword ? "eye" : "eye-off"}
                          size={20}
                          color="#64748b"
                        />
                      </TouchableOpacity>
                    </View>
                    {loginErrors.password && (
                      <Text style={styles.errorText}>
                        {loginErrors.password}
                      </Text>
                    )}
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    style={[
                      styles.button,
                      loginMutation.isPending && styles.buttonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <View style={styles.buttonContent}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.buttonText}>Signing in...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.formContainer}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Create Account</Text>
                  <Text style={styles.cardDescription}>
                    Join FamilyLocator to stay connected with your family
                  </Text>
                </View>

                <View style={styles.form}>
                  {/* Name Inputs */}
                  <View style={styles.row}>
                    <View style={styles.halfInputGroup}>
                      <Text style={styles.label}>First Name</Text>
                      <TextInput
                        style={[
                          styles.input,
                          registerErrors.firstName && styles.inputError,
                        ]}
                        placeholder="John"
                        value={registerFirstName}
                        onChangeText={setRegisterFirstName}
                        autoCapitalize="words"
                      />
                      {registerErrors.firstName && (
                        <Text style={styles.errorText}>
                          {registerErrors.firstName}
                        </Text>
                      )}
                    </View>

                    <View style={styles.halfInputGroup}>
                      <Text style={styles.label}>Last Name</Text>
                      <TextInput
                        style={[
                          styles.input,
                          registerErrors.lastName && styles.inputError,
                        ]}
                        placeholder="Doe"
                        value={registerLastName}
                        onChangeText={setRegisterLastName}
                        autoCapitalize="words"
                      />
                      {registerErrors.lastName && (
                        <Text style={styles.errorText}>
                          {registerErrors.lastName}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={[
                        styles.input,
                        registerErrors.email && styles.inputError,
                      ]}
                      placeholder="your@email.com"
                      value={registerEmail}
                      onChangeText={setRegisterEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {registerErrors.email && (
                      <Text style={styles.errorText}>
                        {registerErrors.email}
                      </Text>
                    )}
                  </View>

                  {/* Phone Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                      style={[
                        styles.input,
                        registerErrors.phoneNumber && styles.inputError,
                      ]}
                      placeholder="+1 (555) 123-4567"
                      value={registerPhone}
                      onChangeText={setRegisterPhone}
                      keyboardType="phone-pad"
                    />
                    {registerErrors.phoneNumber && (
                      <Text style={styles.errorText}>
                        {registerErrors.phoneNumber}
                      </Text>
                    )}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          registerErrors.password && styles.inputError,
                        ]}
                        placeholder="Enter password"
                        value={registerPassword}
                        onChangeText={setRegisterPassword}
                        secureTextEntry={!showRegisterPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() =>
                          setShowRegisterPassword(!showRegisterPassword)
                        }
                      >
                        <Ionicons
                          name={showRegisterPassword ? "eye" : "eye-off"}
                          size={20}
                          color="#64748b"
                        />
                      </TouchableOpacity>
                    </View>
                    {registerErrors.password && (
                      <Text style={styles.errorText}>
                        {registerErrors.password}
                      </Text>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[
                          styles.passwordInput,
                          registerErrors.confirmPassword && styles.inputError,
                        ]}
                        placeholder="Confirm password"
                        value={registerConfirmPassword}
                        onChangeText={setRegisterConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye" : "eye-off"}
                          size={20}
                          color="#64748b"
                        />
                      </TouchableOpacity>
                    </View>
                    {registerErrors.confirmPassword && (
                      <Text style={styles.errorText}>
                        {registerErrors.confirmPassword}
                      </Text>
                    )}
                  </View>

                  {/* Create Account Button */}
                  <TouchableOpacity
                    style={[
                      styles.button,
                      registerMutation.isPending && styles.buttonDisabled,
                    ]}
                    onPress={handleRegister}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <View style={styles.buttonContent}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.buttonText}>
                          Creating account...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabText: {
    color: "#1a202c",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748b",
  },
  formContainer: {
    width: "100%",
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  halfInputGroup: {
    flex: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1a202c",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1a202c",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -14 }],
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#0EA5E9",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
