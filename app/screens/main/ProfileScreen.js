import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import client from "../../config/apollo";
import { registerForPushNotificationsAsync } from "../../utils/notifications";

const REMOVE_PUSH_TOKEN = gql`
  mutation RemovePushToken($token: String!) {
    removePushToken(token: $token)
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      _id
      name
      phone
      profilePhoto
    }
  }
`;

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`;

const GET_ME = gql`
  query GetMe {
    me {
      _id
      name
      email
      phone
      profilePhoto
    }
  }
`;

const GET_MY_REQUESTS = gql`
  query GetMyRequests {
    getMyRequests {
      _id
      status
    }
  }
`;

const GET_MY_ACTIVITIES = gql`
  query GetMyActivities {
    getMyActivityLogs(page: 1, limit: 50) {
      data {
        _id
        status
      }
    }
  }
`;

export default function ProfileScreen({ navigation }) {
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const {
    data: meData,
    loading: meLoading,
    refetch: refetchMe,
  } = useQuery(GET_ME);
  const { data: requestsData } = useQuery(GET_MY_REQUESTS);
  const { data: activitiesData } = useQuery(GET_MY_ACTIVITIES);
  const [removePushToken] = useMutation(REMOVE_PUSH_TOKEN);

  const [updateUser] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      refetchMe();
      setAvatarUri(null);
    },
    onError: (e) => console.log("Update user error:", e.message),
  });

  const [changePassword, { loading: changePasswordLoading }] = useMutation(
    CHANGE_PASSWORD,
    {
      onCompleted: () => {
        Alert.alert("Berhasil! 🎉", "Password berhasil diubah!");
        setShowPasswordModal(false);
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      },
      onError: (e) =>
        Alert.alert("Gagal", e.message || "Password lama tidak sesuai!"),
    },
  );

  const user = meData?.me;
  const myRequests = requestsData?.getMyRequests || [];
  const myActivities = activitiesData?.getMyActivityLogs?.data || [];
  const helpedCount = myActivities.filter(
    (a) => a.status === "completed",
  ).length;
  const pendingRequests = myRequests.filter(
    (r) => r.status === "pending",
  ).length;

  const clearBrowserCookies = () => {
    if (typeof document === "undefined") return;

    document.cookie.split(";").forEach((cookie) => {
      const [cookieName] = cookie.split("=");
      const name = cookieName.trim();
      if (!name) return;

      const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = `${name}=; expires=${expires}; path=/`;
      document.cookie = `${name}=; expires=${expires}; path=/; domain=${window.location.hostname}`;
    });
  };

  const handleLogout = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await removePushToken({ variables: { token: pushToken } });
      }
    } catch {
      // best-effort
    }
    await SecureStore.deleteItemAsync("access_token");
    clearBrowserCookies();
    await client.clearStore();
    navigation.replace("Login");
  };

  const uploadAvatar = async (imageUri) => {
    setShowAvatarOptions(false);
    setUploadError(null);
    setAvatarUri(imageUri);
    setUploadingAvatar(true);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const serverUri = process.env.EXPO_PUBLIC_SERVER_URI?.replace("/graphql", "");
      const formData = new FormData();
      formData.append("file", { uri: imageUri, type: "image/jpeg", name: "avatar.jpg" });
      const response = await fetch(`${serverUri}/upload/profile-photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        await updateUser({ variables: { input: { profilePhoto: data.url } } });
      } else {
        setAvatarUri(null);
        setUploadError("Upload gagal, coba lagi.");
        setShowAvatarOptions(true);
      }
    } catch (e) {
      console.log("Upload error:", e.message);
      setAvatarUri(null);
      setUploadError("Upload gagal, coba lagi.");
      setShowAvatarOptions(true);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickAvatar = () => {
    setUploadError(null);
    setShowAvatarOptions(true);
  };

  const handlePickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const handleChangePassword = () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      Alert.alert("Error", "Semua field harus diisi!");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert("Error", "Password baru tidak cocok!");
      return;
    }
    if (passwordForm.newPassword.length < 5) {
      Alert.alert("Error", "Password baru minimal 5 karakter!");
      return;
    }
    changePassword({
      variables: {
        input: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      },
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (meLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5fca" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <LinearGradient
          colors={["#3b5fca", "#5b7ee5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : user?.profilePhoto ? (
                <Image
                  source={{ uri: user.profilePhoto }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarUploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
            >
              <Ionicons name="camera-outline" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          {user?.phone && (
            <Text style={styles.userPhone}>📞 {user?.phone}</Text>
          )}

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#fbbf24" />
            <Text style={styles.roleText}>USER</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{myRequests.length}</Text>
              <Text style={styles.statLabel}>Requests{"\n"}Created</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{helpedCount}</Text>
              <Text style={styles.statLabel}>Helped{"\n"}Others</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending{"\n"}Requests</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ACTIVITY SECTION */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ACTIVITY</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => navigation.navigate("MyRequests")}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[styles.menuIconWrap, { backgroundColor: "#eff6ff" }]}
                >
                  <Ionicons name="time-outline" size={18} color="#3b5fca" />
                </View>
                <Text style={styles.menuItemLabel}>My Requests</Text>
              </View>
              <View style={styles.menuItemRight}>
                {pendingRequests > 0 && (
                  <View style={styles.menuCountBadge}>
                    <Text style={styles.menuCountText}>{pendingRequests}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("VolunteerHistory")}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[styles.menuIconWrap, { backgroundColor: "#f0fdf4" }]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#22c55e"
                  />
                </View>
                <Text style={styles.menuItemLabel}>Volunteer History</Text>
              </View>
              <View style={styles.menuItemRight}>
                {helpedCount > 0 && (
                  <View
                    style={[
                      styles.menuCountBadge,
                      { backgroundColor: "#22c55e" },
                    ]}
                  >
                    <Text style={styles.menuCountText}>{helpedCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("Create")}
            >
              <LinearGradient
                colors={["#ef4444", "#f97316"]}
                style={styles.quickActionIcon}
              >
                <Ionicons name="alert-circle" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Request Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("Locations")}
            >
              <LinearGradient
                colors={["#8b5cf6", "#a78bfa"]}
                style={styles.quickActionIcon}
              >
                <Ionicons name="location" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Locations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("MapTab")}
            >
              <LinearGradient
                colors={["#22c55e", "#4ade80"]}
                style={styles.quickActionIcon}
              >
                <Ionicons name="map" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>View Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SETTINGS */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>SETTINGS</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[styles.menuIconWrap, { backgroundColor: "#fef2f2" }]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color="#ef4444"
                  />
                </View>
                <Text style={styles.menuItemLabel}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View
                  style={[styles.menuIconWrap, { backgroundColor: "#fff7ed" }]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color="#f97316"
                  />
                </View>
                <Text style={styles.menuItemLabel}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setLogoutVisible(true)}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* VERSION */}
        <Text style={styles.version}>
          ResQ v1.0.0 • Made with ❤️ for Indonesia
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* AVATAR OPTIONS MODAL */}
      <Modal
        transparent
        visible={showAvatarOptions}
        animationType="slide"
        onRequestClose={() => setShowAvatarOptions(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAvatarOptions(false)}
        >
          <Pressable style={styles.avatarOptionsCard} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.avatarOptionsTitle}>Ganti Foto Profil</Text>
            {uploadError && (
              <Text style={styles.avatarOptionsError}>{uploadError}</Text>
            )}
            <TouchableOpacity
              style={styles.avatarOptionBtn}
              onPress={handlePickCamera}
            >
              <View style={[styles.avatarOptionIcon, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="camera-outline" size={22} color="#3b5fca" />
              </View>
              <Text style={styles.avatarOptionLabel}>Kamera</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <View style={styles.avatarOptionDivider} />
            <TouchableOpacity
              style={styles.avatarOptionBtn}
              onPress={handlePickGallery}
            >
              <View style={[styles.avatarOptionIcon, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="image-outline" size={22} color="#22c55e" />
              </View>
              <Text style={styles.avatarOptionLabel}>Galeri</Text>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarCancelBtn}
              onPress={() => setShowAvatarOptions(false)}
            >
              <Text style={styles.avatarCancelText}>Batal</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* LOGOUT MODAL */}
      <Modal
        transparent
        visible={logoutVisible}
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLogoutVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Apakah kamu yakin ingin keluar dari akun ini?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setLogoutVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleLogout}
              >
                <Text style={styles.modalBtnConfirmText}>Ya, Logout</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Password */}
              <Text style={styles.editInputLabel}>Password Saat Ini</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Masukkan password saat ini..."
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showCurrentPassword}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) =>
                    setPasswordForm({ ...passwordForm, currentPassword: text })
                  }
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons
                    name={
                      showCurrentPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <Text style={styles.editInputLabel}>Password Baru</Text>
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Masukkan password baru (min. 5 karakter)..."
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNewPassword}
                  value={passwordForm.newPassword}
                  onChangeText={(text) =>
                    setPasswordForm({ ...passwordForm, newPassword: text })
                  }
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text style={styles.editInputLabel}>
                Konfirmasi Password Baru
              </Text>
              <View
                style={[
                  styles.passwordInputWrap,
                  passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword
                    ? { borderColor: "#ef4444" }
                    : {},
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Ulangi password baru..."
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: text })
                  }
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
              {passwordForm.confirmPassword &&
                passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <Text style={styles.passwordErrorText}>
                    Password tidak cocok!
                  </Text>
                )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                changePasswordLoading && { opacity: 0.7 },
              ]}
              onPress={handleChangePassword}
              disabled={changePasswordLoading}
            >
              <LinearGradient
                colors={["#ef4444", "#f97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtnGradient}
              >
                {changePasswordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Ubah Password</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: "center",
  },

  // Avatar
  avatarSection: { position: "relative", marginBottom: 12 },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  avatarUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
  },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3b5fca",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  userName: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 2 },
  userPhone: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fbbf24",
    letterSpacing: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 26, fontWeight: "800", color: "#fff" },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 8,
  },

  // Menu
  menuSection: { paddingHorizontal: 16, paddingTop: 20 },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemLabel: { fontSize: 15, color: "#0f172a", fontWeight: "500" },
  menuCountBadge: {
    backgroundColor: "#3b5fca",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  menuCountText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  // Quick Actions
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },

  // Logout
  logoutSection: { paddingHorizontal: 16, paddingTop: 20 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },

  // Version
  version: {
    fontSize: 12,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 16,
  },

  // Avatar Options Modal
  avatarOptionsCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  avatarOptionsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 20,
  },
  avatarOptionsError: {
    fontSize: 13,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "600",
  },
  avatarOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  avatarOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  avatarOptionDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  avatarCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  avatarCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748b",
  },

  // Logout Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  modalBtnCancelText: { fontSize: 15, fontWeight: "700", color: "#64748b" },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  modalBtnConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Change Password Modal
  editModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  editModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  editModalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

  // Avatar Edit
  editAvatarSection: { alignItems: "center", marginBottom: 20 },
  editAvatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#bfdbfe",
  },
  editAvatarImage: { width: 90, height: 90, borderRadius: 45 },
  editAvatarText: { fontSize: 32, fontWeight: "800", color: "#3b5fca" },
  editAvatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  changePhotoBtnText: { fontSize: 13, fontWeight: "600", color: "#3b5fca" },
  uploadSuccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  uploadSuccessText: { fontSize: 12, color: "#22c55e", fontWeight: "600" },

  // Form
  editInputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },
  editInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },

  // Password Input
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  passwordInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  passwordErrorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },

  // Save Button
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  saveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
