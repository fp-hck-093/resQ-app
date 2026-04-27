import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const CREATE_REQUEST = gql`
  mutation CreateRequest($input: CreateRequestInput!) {
    createRequest(input: $input) {
      _id
      description
      status
      category
    }
  }
`;

const CATEGORIES = [
  { key: 'Food', emoji: '🍚', label: 'Food', color: '#f97316', bg: '#fff7ed' },
  { key: 'Medical', emoji: '💊', label: 'Medical', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'Rescue', emoji: '🚨', label: 'Rescue', color: '#ef4444', bg: '#fef2f2' },
  { key: 'Shelter', emoji: '🏠', label: 'Shelter', color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'Money/Item', emoji: '💰', label: 'Other', color: '#22c55e', bg: '#f0fdf4' },
];

export default function CreateScreen({ navigation }) {
  const [form, setForm] = useState({
    category: '',
    numberOfPeople: '1',
    description: '',
    address: '',
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [createRequest, { loading }] = useMutation(CREATE_REQUEST, {
    onCompleted: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({ category: '', numberOfPeople: '1', description: '', address: '' });
        navigation.navigate('Requests');
      }, 2000);
    },
    onError: (error) => {
      console.log('Create request error:', error.message);
    },
  });

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const loc = geocode[0];
        const address = `${loc.street || ''} ${loc.district || ''}, ${loc.city || ''}, ${loc.region || ''}`.trim();
        setForm({ ...form, address });
      }
    } catch (e) {
      console.log('Location error:', e);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.category || !form.description) return;
    createRequest({
      variables: {
        input: {
          category: form.category,
          description: form.description,
          numberOfPeople: parseInt(form.numberOfPeople) || 1,
          address: form.address,
        },
      },
    });
  };

  const isValid = form.category !== '' && form.description !== '';

  if (success) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#3b5fca', '#5b7ee5']} style={styles.successGradient}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={80} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Request Terkirim!</Text>
          <Text style={styles.successDesc}>
            Tim volunteer akan segera menghubungi kamu. Tetap tenang!
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        {/* HEADER */}
        <LinearGradient colors={['#ef4444', '#f97316']} style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="alert-circle" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Request Help</Text>
            <Text style={styles.headerSubtitle}>Emergency assistance when you need it</Text>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* LOCATION */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <TouchableOpacity style={styles.locationCard} onPress={handleGetLocation}>
              <View style={styles.locationLeft}>
                <View style={styles.locationIconWrap}>
                  <Ionicons name="location" size={20} color="#3b5fca" />
                </View>
                <View>
                  <Text style={styles.locationTitle}>
                    {form.address || 'Current Location'}
                  </Text>
                  <Text style={styles.locationSubtitle}>
                    {form.address ? 'Tap to update' : 'Tap to detect location'}
                  </Text>
                </View>
              </View>
              {locationLoading ? (
                <ActivityIndicator size="small" color="#3b5fca" />
              ) : (
                <Text style={styles.changeBtn}>
                  {form.address ? 'Change' : 'Detect'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* CATEGORY */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Category <Text style={styles.required}>*</Text></Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryCard,
                    form.category === cat.key && { borderColor: cat.color, borderWidth: 2 },
                    { backgroundColor: form.category === cat.key ? cat.bg : '#fff' }
                  ]}
                  onPress={() => setForm({ ...form, category: cat.key })}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    { color: form.category === cat.key ? cat.color : '#64748b' }
                  ]}>
                    {cat.label}
                  </Text>
                  {form.category === cat.key && (
                    <View style={[styles.categoryCheck, { backgroundColor: cat.color }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* NUMBER OF PEOPLE */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Number of People Affected <Text style={styles.required}>*</Text></Text>
            <View style={styles.numberRow}>
              <View style={styles.numberIconWrap}>
                <Ionicons name="people-outline" size={20} color="#64748b" />
              </View>
              <TextInput
                style={styles.numberInput}
                keyboardType="numeric"
                value={form.numberOfPeople}
                onChangeText={(text) => setForm({ ...form, numberOfPeople: text })}
                placeholder="1"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.numberStepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const val = Math.max(1, parseInt(form.numberOfPeople || 1) - 1);
                    setForm({ ...form, numberOfPeople: val.toString() });
                  }}
                >
                  <Ionicons name="remove" size={18} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const val = parseInt(form.numberOfPeople || 1) + 1;
                    setForm({ ...form, numberOfPeople: val.toString() });
                  }}
                >
                  <Ionicons name="add" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* DESCRIPTION */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description <Text style={styles.required}>*</Text></Text>
            <View style={styles.textAreaWrap}>
              <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                placeholder="Describe your situation in detail..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={5}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text.slice(0, 500) })}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{form.description.length}/500</Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* SUBMIT BUTTON */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            style={[styles.submitBtn, (!isValid || loading) && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={isValid ? ['#ef4444', '#f97316'] : ['#94a3b8', '#94a3b8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Emergency Request</Text>
                  <Ionicons name="send" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },

  // Success
  successContainer: { flex: 1 },
  successGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 12 },
  successDesc: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Section
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  required: { color: '#ef4444' },

  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  locationSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  changeBtn: { fontSize: 13, fontWeight: '700', color: '#3b5fca' },

  // Category
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  categoryEmoji: { fontSize: 28, marginBottom: 6 },
  categoryLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  categoryCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Number
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 4,
    gap: 10,
  },
  numberIconWrap: { padding: 4 },
  numberInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 12,
  },
  numberStepper: { flexDirection: 'row', gap: 4 },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text Area
  textAreaWrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    minHeight: 130,
  },
  textAreaIcon: { marginBottom: 8 },
  textArea: { fontSize: 14, color: '#0f172a', lineHeight: 20, minHeight: 80 },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 8 },

  // Submit
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});