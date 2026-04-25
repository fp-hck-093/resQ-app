import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const locations = [
  { id: '1', name: 'Makassar Hometown', radius: '10km', alerts: 'Requests + danger zones' },
  { id: '2', name: 'Rumah Orang Tua', radius: '5km', alerts: 'New requests' },
];

export default function SavedLocationsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Saved Locations</Text>
        <Text style={styles.subtitle}>Pantau lokasi keluarga atau hometown walaupun kamu sedang jauh.</Text>

        <Pressable style={styles.addButton}>
          <Text style={styles.addButtonText}>Add Saved Location</Text>
        </Pressable>

        {locations.map((location) => (
          <View key={location.id} style={styles.card}>
            <Text style={styles.locationName}>{location.name}</Text>
            <Text style={styles.locationMeta}>Notification radius: {location.radius}</Text>
            <Text style={styles.locationMeta}>{location.alerts}</Text>
          </View>
        ))}
      </ScrollView>
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
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 22, paddingBottom: 34 },
  backText: { color: '#2f5d95', fontSize: 14, fontWeight: '700', marginBottom: 18 },
  title: { color: '#17263b', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#607089', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  addButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#c7dcf7',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: { color: '#2f5d95', fontWeight: '800', fontSize: 14 },
  card: {
    backgroundColor: '#f8fbff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8f8',
    marginTop: 12,
  },
  locationName: { color: '#17263b', fontSize: 16, fontWeight: '800' },
  locationMeta: { color: '#607089', fontSize: 13, marginTop: 6 },
});
