import React, { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const categories = ['Food', 'Medical', 'Rescue', 'Shelter', 'Other'];

export default function CreateRequestScreen({ navigation }) {
  const [category, setCategory] = useState('Food');
  const [peopleCount, setPeopleCount] = useState('1');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Validasi', 'Deskripsi kondisi wajib diisi.');
      return;
    }

    Alert.alert('Request dibuat', 'Nanti ini akan disambungkan ke mutation createRequest.', [
      { text: 'OK', onPress: () => navigation.navigate('Home') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Request Help</Text>
        <Text style={styles.subtitle}>Kirim bantuan darurat dengan lokasi, kategori, jumlah orang, dan deskripsi.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.chips}>
            {categories.map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, category === item && styles.chipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>NUMBER OF PEOPLE</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={peopleCount}
            onChangeText={setPeopleCount}
            placeholder="Contoh: 5"
            placeholderTextColor="#7c8daa"
          />

          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            maxLength={500}
            value={description}
            onChangeText={setDescription}
            placeholder="Ceritakan situasi, kebutuhan, dan kondisi sekitar..."
            placeholderTextColor="#7c8daa"
          />

          <View style={styles.photoBox}>
            <Text style={styles.photoTitle}>Photo Upload</Text>
            <Text style={styles.photoText}>Placeholder untuk kamera/gallery sesuai plan MVP.</Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>Submit Request</Text>
          </Pressable>
        </View>
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
  subtitle: { color: '#607089', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  card: {
    backgroundColor: '#f8fbff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dce8f8',
  },
  label: { color: '#2f5d95', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 14, marginBottom: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce8f8',
  },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#3f7fca' },
  chipText: { color: '#607089', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#2f5d95' },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#18283c',
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: '#dce8f8',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  photoBox: {
    marginTop: 18,
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#c7dcf7',
  },
  photoTitle: { color: '#2f5d95', fontWeight: '800', fontSize: 14 },
  photoText: { color: '#607089', fontSize: 13, marginTop: 4 },
  primaryButton: { backgroundColor: '#3f7fca', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
