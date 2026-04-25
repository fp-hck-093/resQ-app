import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const requests = [
  { id: '1', category: 'Food', urgency: 'High', distance: '2km', people: '5', status: 'Pending' },
  { id: '2', category: 'Medical', urgency: 'Critical', distance: '3.4km', people: '2', status: 'Pending' },
  { id: '3', category: 'Shelter', urgency: 'Medium', distance: '5km', people: '12', status: 'Accepted' },
];

export default function BrowseRequestsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Browse Requests</Text>
        <Text style={styles.subtitle}>Mode volunteer untuk melihat request berdasarkan urgensi dan jarak.</Text>

        <View style={styles.filterRow}>
          {['3km', '5km', '10km', 'Global'].map((filter) => (
            <View key={filter} style={styles.filterChip}>
              <Text style={styles.filterText}>{filter}</Text>
            </View>
          ))}
        </View>

        {requests.map((request) => (
          <View key={request.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.category}>{request.category}</Text>
              <Text style={styles.status}>{request.status}</Text>
            </View>
            <Text style={styles.requestTitle}>{request.urgency} urgency request</Text>
            <Text style={styles.meta}>{request.distance} away - {request.people} people affected</Text>
            <Pressable style={styles.acceptButton}>
              <Text style={styles.acceptText}>Accept Request</Text>
            </Pressable>
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#c7dcf7',
  },
  filterText: { color: '#2f5d95', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#f8fbff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dce8f8',
    marginTop: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { color: '#2f5d95', fontSize: 13, fontWeight: '800' },
  status: { color: '#facc15', fontSize: 12, fontWeight: '700' },
  requestTitle: { color: '#17263b', fontSize: 17, fontWeight: '700', marginTop: 12 },
  meta: { color: '#607089', fontSize: 13, marginTop: 6 },
  acceptButton: { backgroundColor: '#3f7fca', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  acceptText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
