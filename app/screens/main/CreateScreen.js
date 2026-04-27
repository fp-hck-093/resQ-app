import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function CreateScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create</Text>
        <Text style={styles.subtitle}>Coming soon...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: "#17263b", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#9CA3AF", fontSize: 14, marginTop: 8 },
});
