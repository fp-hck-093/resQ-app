import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import * as SecureStore from "expo-secure-store";
import client from "../../config/apollo";
import { registerForPushNotificationsAsync } from "../../utils/notifications";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const SAVE_PUSH_TOKEN = gql`
  mutation SavePushToken($token: String!) {
    savePushToken(token: $token)
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        _id
        name
        email
        phone
      }
    }
  }
`;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const floatC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: -10,
            duration: 1400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      );
    makeLoop(floatA, 0).start();
    makeLoop(floatB, 500).start();
    makeLoop(floatC, 900).start();
  }, []);

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: async (data) => {
      if (data.login.token) {
        await SecureStore.setItemAsync("access_token", data.login.token);
        const pushToken = await registerForPushNotificationsAsync();
        console.log("[Push] push token obtained:", pushToken);
        if (pushToken) {
          try {
            await client.mutate({
              mutation: SAVE_PUSH_TOKEN,
              variables: { token: pushToken },
            });
            console.log("[Push] push token saved to DB");
          } catch (err) {
            console.warn(
              "[Push] savePushToken mutation failed:",
              err?.message ?? err,
            );
          }
        }
      }
      navigation.replace("Home");
    },
    onError: (error) => {
      setApiError(error.message);
    },
  });

  const validate = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = "Format email tidak valid";
    if (!password) nextErrors.password = "Password wajib diisi";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    void login({
      variables: { input: { email: email.trim().toLowerCase(), password } },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Blue header with logo */}
          <View style={styles.header}>
            <Animated.View
              style={[
                styles.floatingBtn,
                styles.floatingBtnTopLeft,
                { transform: [{ translateY: floatA }] },
              ]}
            >
              <Ionicons name="heart-outline" size={18} color="#fff" />
            </Animated.View>
            <Animated.View
              style={[
                styles.floatingBtn,
                styles.floatingBtnBottomLeft,
                { transform: [{ translateY: floatB }] },
              ]}
            >
              <Ionicons name="people-outline" size={18} color="#fff" />
            </Animated.View>
            <Animated.View
              style={[
                styles.floatingBtn,
                styles.floatingBtnRight,
                { transform: [{ translateY: floatC }] },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#fff"
              />
            </Animated.View>

            <View style={styles.logoCard}>
              <Image
                source={require("../../assets/ResQ2.png")}
                style={styles.logoImage}
              />
              <Text style={styles.logoCardTitle}>ResQ</Text>
              <Text style={styles.logoCardSubtitle}>
                CONNECTING HELP{"\n"}When It Matters Most
              </Text>
            </View>
          </View>

          {/* Form section */}
          <View style={styles.formSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue helping your community
            </Text>

            {apiError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#dc2626"
                />
                <Text style={styles.errorBannerText}>{apiError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "email" && styles.inputWrapFocused,
                  errors.email && styles.inputWrapError,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors((curr) => ({ ...curr, email: undefined }));
                    if (apiError) setApiError("");
                  }}
                />
              </View>
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}

              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "password" && styles.inputWrapFocused,
                  errors.password && styles.inputWrapError,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#94a3b8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password)
                      setErrors((curr) => ({ ...curr, password: undefined }));
                  }}
                />
                <Pressable
                  onPress={() => setShowPassword((curr) => !curr)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#94a3b8"
                  />
                </Pressable>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}

              <Pressable
                style={styles.forgotRow}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Signing in..." : "Sign In  →"}
                </Text>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Pressable onPress={() => navigation.replace("Register")}>
                <Text style={styles.footerLink}> Sign Up</Text>
              </Pressable>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureItem}>
                <Ionicons name="flash-outline" size={20} color="#3b5fca" />
                <Text style={styles.featureLabel}>Fast Response</Text>
              </View>
              <View style={styles.featureDivider} />
              <View style={styles.featureItem}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#3b5fca"
                />
                <Text style={styles.featureLabel}>Verified Users</Text>
              </View>
              <View style={styles.featureDivider} />
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={20} color="#3b5fca" />
                <Text style={styles.featureLabel}>Community</Text>
              </View>
            </View>

            <Text style={styles.legalText}>
              By signing in, you agree to our{" "}
              <Text style={styles.legalLink}>Terms of Service</Text>
              {" "}and{" "}
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Text>

            <Text style={styles.versionText}>v1.0.0 · ResQ</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#3b5fca" },
  keyboardAvoid: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Header
  header: {
    backgroundColor: "#3b5fca",
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  floatingBtn: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBtnTopLeft: { top: 16, left: 20 },
  floatingBtnBottomLeft: { bottom: 20, left: 22 },
  floatingBtnRight: { top: 44, right: 20 },
  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    gap: 4,
  },
  logoImage: { width: 72, height: 72, resizeMode: "contain" },
  logoCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 2,
  },
  logoCardSubtitle: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 12,
    fontWeight: "500",
  },

  // Form section
  formSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  form: { gap: 2 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
  },
  inputWrapFocused: { borderColor: "#3b5fca", backgroundColor: "#fff" },
  inputWrapError: { borderColor: "#ef4444" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: "#0f172a" },
  eyeBtn: { padding: 4 },
  errorText: { color: "#ef4444", fontSize: 11, marginTop: 2 },
  forgotRow: { alignItems: "flex-end", marginTop: 4 },
  forgotText: { color: "#3b5fca", fontSize: 13, fontWeight: "700" },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#3b5fca",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonPressed: { opacity: 0.88 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 2,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dividerText: { fontSize: 12, color: "#94a3b8" },

  // Social
  socialRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  socialBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  socialBtnText: { fontSize: 13, fontWeight: "700", color: "#1e293b" },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  footerText: { color: "#64748b", fontSize: 13 },
  footerLink: { color: "#3b5fca", fontSize: 13, fontWeight: "800" },

  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  featureDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#e2e8f0",
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },

  legalText: {
    textAlign: "center",
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 16,
    lineHeight: 17,
  },
  legalLink: {
    color: "#3b5fca",
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 8,
    marginBottom: 4,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: "#dc2626" },
});
