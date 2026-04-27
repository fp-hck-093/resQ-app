import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";

export default function ProfileScreen({ navigation }) {
  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    navigation.replace("Login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Coming soon...</Text>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: "#17263b", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#9CA3AF", fontSize: 14, marginTop: 8 },
  logoutBtn: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: "#ef4444",
    borderRadius: 12,
  },
  logoutText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
