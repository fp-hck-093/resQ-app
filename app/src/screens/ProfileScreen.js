import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen({ navigation }) {
  const handleLogout = () => {
    SecureStore.deleteItemAsync('access_token');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <View style={styles.container}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
        <Text style={styles.name}>Relawan resQ</Text>
        <Text style={styles.subtitle}>Volunteer mode: available</Text>

        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Requests created</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Completed tasks</Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  decorTop: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#dbeafe',
    top: -120,
    right: -110,
  },
  decorBottom: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#eff6ff',
    bottom: -120,
    left: -90,
  },
  container: { flex: 1, backgroundColor: 'transparent', padding: 22 },
  backText: { color: '#2f5d95', fontSize: 14, fontWeight: '700', marginBottom: 38 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignSelf: 'center',
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#c7dcf7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#2f5d95', fontSize: 34, fontWeight: '800' },
  name: { color: '#17263b', fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 18 },
  subtitle: { color: '#607089', fontSize: 14, textAlign: 'center', marginTop: 6 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 30 },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8f8',
  },
  statNumber: { color: '#2f5d95', fontSize: 26, fontWeight: '800' },
  statLabel: { color: '#607089', fontSize: 13, marginTop: 6 },
  logoutButton: { backgroundColor: '#3f7fca', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 30 },
  logoutText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
