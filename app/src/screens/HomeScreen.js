import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

const requests = [
  {
    id: '1',
    title: 'Butuh makanan',
    category: 'Food',
    status: 'Pending',
    coordinate: { latitude: -6.2, longitude: 106.816666 },
    color: '#facc15',
  },
  {
    id: '2',
    title: 'Evakuasi lansia',
    category: 'Rescue',
    status: 'Accepted',
    coordinate: { latitude: -6.212, longitude: 106.828 },
    color: '#3f7fca',
  },
  {
    id: '3',
    title: 'Bantuan medis',
    category: 'Medical',
    status: 'In Progress',
    coordinate: { latitude: -6.19, longitude: 106.805 },
    color: '#f87171',
  },
];

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>resQ</Text>
            <Text style={styles.subtitle}>Interactive Crisis Map</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileInitial}>R</Text>
          </Pressable>
        </View>

        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: -6.2,
              longitude: 106.816666,
              latitudeDelta: 0.055,
              longitudeDelta: 0.055,
            }}
          >
            <Circle
              center={{ latitude: -6.205, longitude: 106.818 }}
              radius={1800}
              fillColor="rgba(248, 113, 113, 0.14)"
              strokeColor="rgba(248, 113, 113, 0.32)"
            />
            {requests.map((request) => (
              <Marker
                key={request.id}
                coordinate={request.coordinate}
                title={request.title}
                description={`${request.category} - ${request.status}`}
                pinColor={request.color}
              />
            ))}
          </MapView>
        </View>

        <View style={styles.quickActions}>
          <Pressable style={styles.primaryAction} onPress={() => navigation.navigate('CreateRequest')}>
            <Text style={styles.primaryActionText}>Request Help</Text>
          </Pressable>
          <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('BrowseRequests')}>
            <Text style={styles.secondaryActionText}>Volunteer</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status darurat</Text>
          <View style={styles.statusRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Active requests</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1.8km</Text>
              <Text style={styles.statLabel}>Nearest help</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved locations</Text>
            <Pressable onPress={() => navigation.navigate('SavedLocations')}>
              <Text style={styles.sectionLink}>Kelola</Text>
            </Pressable>
          </View>
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Makassar Hometown</Text>
            <Text style={styles.locationText}>2 request aktif dalam radius 10km</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  decorTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#dbeafe',
    top: -120,
    right: -110,
  },
  decorBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#eff6ff',
    bottom: -130,
    left: -90,
  },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingBottom: 34 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: { color: '#1c304a', fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  subtitle: { color: '#607089', fontSize: 14, marginTop: 4 },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#c7dcf7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { color: '#2f5d95', fontWeight: '800', fontSize: 18 },
  mapCard: {
    height: 300,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dce8f8',
    backgroundColor: '#f8fbff',
  },
  map: { flex: 1 },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primaryAction: {
    flex: 1,
    backgroundColor: '#3f7fca',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryActionText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  secondaryAction: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7dcf7',
    backgroundColor: '#eff6ff',
  },
  secondaryActionText: { color: '#2f5d95', fontSize: 15, fontWeight: '700' },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#17263b', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sectionLink: { color: '#2f5d95', fontSize: 14, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8f8',
  },
  statNumber: { color: '#2f5d95', fontSize: 24, fontWeight: '800' },
  statLabel: { color: '#607089', fontSize: 13, marginTop: 4 },
  locationCard: {
    backgroundColor: '#f8fbff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8f8',
  },
  locationTitle: { color: '#18283c', fontSize: 15, fontWeight: '700' },
  locationText: { color: '#607089', fontSize: 13, marginTop: 6 },
});
