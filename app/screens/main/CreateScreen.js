import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Modal } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [success, setSuccess] = useState(false);
  const mapRef = React.useRef(null);

  const [createRequest, { loading }] = useMutation(CREATE_REQUEST, {
    onCompleted: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({ category: '', numberOfPeople: '1', description: '', address: '' });
        setPinnedLocation(null);
        setPhotos([]);
        navigation.navigate('Requests');
      }, 2000);
    },
    onError: (error) => console.log('Create request error:', error.message),
  });

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setPinnedLocation({ latitude, longitude });
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

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinnedLocation({ latitude, longitude });
    setMapLoading(true);
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const loc = geocode[0];
        setForm({
          ...form,
          address: `${loc.street || ''} ${loc.district || ''}, ${loc.city || ''}, ${loc.region || ''}`.trim(),
        });
      }
    } catch (e) {
      console.log('Geocode error:', e);
    } finally {
      setMapLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setPinnedLocation({ latitude, longitude });
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const loc = geocode[0];
          setForm({
            ...form,
            address: `${loc.street || ''} ${loc.district || ''}, ${loc.city || ''}, ${loc.region || ''}`.trim(),
          });
        }
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (e) {
      console.log('Search error:', e);
    } finally {
      setSearchLoading(false);
    }
  };

  const uploadPhotoToCloudinary = async (imageUri) => {
    setUploadingPhoto(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const serverUri = process.env.EXPO_PUBLIC_SERVER_URI?.replace('/graphql', '');

      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      const response = await fetch(`${serverUri}/upload/request-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (data.url) {
        setPhotos(prev => [...prev, { uri: imageUri, url: data.url }]);
      }
    } catch (e) {
      console.log('Upload error:', e);
      Alert.alert('Error', 'Gagal upload foto. Coba lagi!');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickImage = async () => {
    Alert.alert(
      'Tambah Foto',
      'Pilih sumber foto',
      [
        {
          text: '📷 Kamera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission diperlukan', 'Izinkan akses kamera untuk mengambil foto');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadPhotoToCloudinary(result.assets[0].uri);
            }
          },
        },
        {
          text: '🖼️ Galeri',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission diperlukan', 'Izinkan akses galeri untuk memilih foto');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              await uploadPhotoToCloudinary(result.assets[0].uri);
            }
          },
        },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description) return;

    createRequest({
      variables: {
        input: {
          category: form.category,
          description: form.description,
          numberOfPeople: parseInt(form.numberOfPeople) || 1,
          location: {
            type: 'Point',
            coordinates: pinnedLocation
              ? [pinnedLocation.longitude, pinnedLocation.latitude]
              : [106.8456, -6.2088],
          },
          address: form.address || 'Lokasi tidak tersedia',
          photos: photos.map(p => p.url),
        },
      },
    });
  };

  const isValid = form.category !== '' && form.description !== '';

  if (success) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#ef4444', '#f97316']} style={styles.successGradient}>
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

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
            <View style={styles.locationCard}>
              <View style={styles.locationLeft}>
                <View style={styles.locationIconWrap}>
                  <Ionicons name="location" size={20} color="#3b5fca" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationTitle} numberOfLines={1}>
                    {form.address || 'Belum ada lokasi dipilih'}
                  </Text>
                  <Text style={styles.locationSubtitle}>
                    {pinnedLocation ? 'Lokasi sudah dipilih ✅' : 'Pilih lokasi kamu'}
                  </Text>
                </View>
              </View>

              <View style={styles.locationBtns}>
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={handleGetLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#3b5fca" />
                  ) : (
                    <Ionicons name="locate" size={16} color="#3b5fca" />
                  )}
                  <Text style={styles.locationBtnText}>Detect</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.locationBtn, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}
                  onPress={() => setShowMapModal(true)}
                >
                  <Ionicons name="map" size={16} color="#8b5cf6" />
                  <Text style={[styles.locationBtnText, { color: '#8b5cf6' }]}>Peta</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                    form.category === cat.key && { borderColor: cat.color, borderWidth: 2, backgroundColor: cat.bg }
                  ]}
                  onPress={() => setForm({ ...form, category: cat.key })}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, { color: form.category === cat.key ? cat.color : '#64748b' }]}>
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
              <Ionicons name="document-text-outline" size={18} color="#94a3b8" style={{ marginBottom: 8 }} />
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

          {/* PHOTOS */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Foto Kondisi</Text>
            <Text style={styles.sectionHint}>Tambahkan foto untuk memperjelas situasi (opsional)</Text>

            <View style={styles.photosRow}>
              {/* Existing photos */}
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoWrap}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                  {uploadingPhoto && index === photos.length - 1 ? (
                    <View style={styles.photoUploadingOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => handleRemovePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Add photo button */}
              {photos.length < 4 && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={handlePickImage}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#3b5fca" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={24} color="#3b5fca" />
                      <Text style={styles.addPhotoBtnText}>Tambah Foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
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

      {/* MAP PICKER MODAL */}
      <Modal visible={showMapModal} animationType="slide" statusBarTranslucent>
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              style={styles.mapBackBtn}
              onPress={() => setShowMapModal(false)}
            >
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Pilih Lokasi</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* SEARCH BAR */}
          <View style={styles.mapSearchBar}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={styles.mapSearchInput}
              placeholder="Cari alamat atau nama tempat..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchLocation}
              returnKeyType="search"
            />
            {searchLoading ? (
              <ActivityIndicator size="small" color="#3b5fca" />
            ) : (
              <TouchableOpacity onPress={handleSearchLocation}>
                <Ionicons name="arrow-forward-circle" size={24} color="#3b5fca" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.mapHint}>
            <Ionicons name="information-circle-outline" size={14} color="#3b5fca" />
            <Text style={styles.mapHintText}>Tap di peta untuk memilih lokasi</Text>
          </View>

          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: -6.2088,
              longitude: 106.8456,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onPress={handleMapPress}
            showsUserLocation
            zoomEnabled
            scrollEnabled
            zoomControlEnabled
          >
            {pinnedLocation && (
              <Marker coordinate={pinnedLocation}>
                <View style={styles.pinMarker}>
                  <Ionicons name="location" size={40} color="#ef4444" />
                </View>
              </Marker>
            )}
          </MapView>

          <View style={styles.mapBottom}>
            {mapLoading ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" color="#3b5fca" />
                <Text style={styles.mapLoadingText}>Mendeteksi alamat...</Text>
              </View>
            ) : pinnedLocation ? (
              <View>
                <View style={styles.mapAddressRow}>
                  <Ionicons name="location" size={16} color="#3b5fca" />
                  <Text style={styles.mapAddress} numberOfLines={2}>
                    {form.address || 'Alamat terdeteksi...'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowMapModal(false)}>
                  <LinearGradient
                    colors={['#ef4444', '#f97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mapConfirmGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.mapConfirmText}>Konfirmasi Lokasi</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mapEmpty}>
                <Ionicons name="hand-left-outline" size={24} color="#94a3b8" />
                <Text style={styles.mapEmptyText}>Tap di peta untuk memilih lokasi</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
  sectionHint: { fontSize: 12, color: '#94a3b8', marginBottom: 10, marginTop: -6 },
  required: { color: '#ef4444' },

  // Location
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 10,
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
  locationTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  locationSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  locationBtns: { flexDirection: 'row', gap: 8 },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  locationBtnText: { fontSize: 12, fontWeight: '600', color: '#3b5fca' },

  // Category
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  categoryLabel: { fontSize: 12, fontWeight: '700' },
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
  numberInput: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a', paddingVertical: 12 },
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
  textArea: { fontSize: 14, color: '#0f172a', lineHeight: 20, minHeight: 80 },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 8 },

  // Photos
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: { position: 'relative', width: 80, height: 80 },
  photoThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f1f5f9' },
  photoUploadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBtn: { position: 'absolute', top: -6, right: -6 },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoBtnText: { fontSize: 10, fontWeight: '600', color: '#3b5fca', textAlign: 'center' },

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

  // Map Modal
  mapContainer: { flex: 1, backgroundColor: '#fff' },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mapBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  mapSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mapSearchInput: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 8 },
  mapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapHintText: { fontSize: 12, color: '#3b5fca', fontWeight: '600' },
  map: { flex: 1 },
  pinMarker: { alignItems: 'center', justifyContent: 'center' },
  mapBottom: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 8,
  },
  mapLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  mapLoadingText: { fontSize: 14, color: '#64748b' },
  mapAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  mapAddress: { fontSize: 13, color: '#0f172a', flex: 1, lineHeight: 18 },
  mapConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  mapConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  mapEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  mapEmptyText: { fontSize: 13, color: '#94a3b8' },
});