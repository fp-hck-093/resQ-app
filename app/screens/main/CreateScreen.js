import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Modal } from "react-native";
import * as SecureStore from "expo-secure-store";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

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
  {
    key: "Rescue",
    icon: "warning-outline",
    label: "Rescue",
    color: "#ef4444",
    bg: "#fef2f2",
  },
  {
    key: "Shelter",
    icon: "home-outline",
    label: "Shelter",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    key: "Food",
    icon: "fast-food-outline",
    label: "Food",
    color: "#f97316",
    bg: "#fff7ed",
  },
  {
    key: "Medical",
    icon: "medkit-outline",
    label: "Medical",
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    key: "Money/Item",
    icon: "cash-outline",
    label: "Other",
    color: "#22c55e",
    bg: "#f0fdf4",
  },
];

export default function CreateScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    category: "",
    numberOfPeople: "1",
    description: "",
    address: "",
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [success, setSuccess] = useState(false);
  const mapRef = React.useRef(null);

  const [createRequest, { loading }] = useMutation(CREATE_REQUEST, {
    onCompleted: () => {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setForm({
          category: "",
          numberOfPeople: "1",
          description: "",
          address: "",
        });
        setPinnedLocation(null);
        setPhotos([]);
        navigation.navigate("Requests");
      }, 2200);
    },
    onError: (error) => console.log("Create request error:", error.message),
  });

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setPinnedLocation({ latitude, longitude });
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geocode.length > 0) {
        const loc = geocode[0];
        setForm({
          ...form,
          address:
            `${loc.street || ""} ${loc.district || ""}, ${loc.city || ""}, ${loc.region || ""}`.trim(),
        });
      }
    } catch (e) {
      console.log("Location error:", e);
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinnedLocation({ latitude, longitude });
    setMapLoading(true);
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geocode.length > 0) {
        const loc = geocode[0];
        setForm({
          ...form,
          address:
            `${loc.street || ""} ${loc.district || ""}, ${loc.city || ""}, ${loc.region || ""}`.trim(),
        });
      }
    } catch (e) {
      console.log("Geocode error:", e);
    } finally {
      setMapLoading(false);
    }
  };

  const handleSearchChange = async (text) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
        },
        body: JSON.stringify({ input: text, includedRegionCodes: ["id"], languageCode: "id" }),
      });
      const data = await res.json();
      const predictions = (data.suggestions ?? []).map((s) => s.placePrediction).filter(Boolean);
      setSuggestions(predictions);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (item) => {
    setSuggestions([]);
    setSearchQuery(item.structuredFormat?.mainText?.text ?? item.text?.text ?? "");
    setMapLoading(true);
    try {
      const detailRes = await fetch(
        `https://places.googleapis.com/v1/${item.place}`,
        {
          headers: {
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask": "location",
          },
        },
      );
      const detailData = await detailRes.json();
      const loc = detailData.location;
      if (!loc) return;
      const latitude = loc.latitude;
      const longitude = loc.longitude;
      setPinnedLocation({ latitude, longitude });
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        800,
      );
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const g = geocode[0];
        setForm({
          ...form,
          address:
            `${g.street || ""} ${g.district || ""}, ${g.city || ""}, ${g.region || ""}`.trim(),
        });
      }
    } catch (e) {
      console.log("Place detail error:", e);
    } finally {
      setMapLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSuggestions([]);
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
            address:
              `${loc.street || ""} ${loc.district || ""}, ${loc.city || ""}, ${loc.region || ""}`.trim(),
          });
        }
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          1000,
        );
      }
    } catch (e) {
      console.log("Search error:", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const uploadPhotoToCloudinary = async (imageUri) => {
    // Show thumbnail immediately while uploading
    setPhotos((prev) => [...prev, { uri: imageUri, url: null, uploading: true }]);
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const serverUri = process.env.EXPO_PUBLIC_SERVER_URI?.replace(
        "/graphql",
        "",
      );
      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "photo.jpg",
      });
      const response = await fetch(`${serverUri}/upload/request-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.uri === imageUri ? { uri: imageUri, url: data.url, uploading: false } : p,
          ),
        );
      } else {
        setPhotos((prev) => prev.filter((p) => p.uri !== imageUri));
      }
    } catch (e) {
      console.log("Upload error:", e);
      setPhotos((prev) => prev.filter((p) => p.uri !== imageUri));
    }
  };

  const handlePickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      await uploadPhotoToCloudinary(result.assets[0].uri);
  };

  const handlePickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0])
      await uploadPhotoToCloudinary(result.assets[0].uri);
  };

  const handleRemovePhoto = (index) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!form.category || !form.description) return;

    createRequest({
      variables: {
        input: {
          category: form.category,
          description: form.description,
          numberOfPeople: parseInt(form.numberOfPeople) || 1,
          location: {
            type: "Point",
            coordinates: [pinnedLocation.longitude, pinnedLocation.latitude],
          },
          address: form.address || "Lokasi tidak tersedia",
          photos: photos.filter((p) => p.url).map((p) => p.url),
        },
      },
    });
  };

  const isValid =
    form.category !== "" &&
    form.description.trim() !== "" &&
    pinnedLocation !== null;
  const selectedCat = CATEGORIES.find((c) => c.key === form.category);

  // ─── SUCCESS ─────────────────────────────────────────────────────────────
  if (success) {
    return (
      <LinearGradient
        colors={["#ef4444", "#f97316"]}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <View style={s.successRing}>
          <View style={s.successCircle}>
            <Ionicons name="checkmark" size={60} color="#ef4444" />
          </View>
        </View>
        <Text style={s.successTitle}>Request Terkirim! 🎉</Text>
        <Text style={s.successSub}>
          Tim volunteer akan segera menghubungi kamu.{"\n"}Tetap tenang dan aman
          ya!
        </Text>
      </LinearGradient>
    );
  }

  // ─── MAIN ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ══ HERO HEADER ══════════════════════════════════════════════════ */}
        <LinearGradient
          colors={["#c0392b", "#e74c3c", "#f97316"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          {/* Decorative circles */}
          <View
            style={[
              s.decCircle,
              { width: 120, height: 120, top: -40, right: -20, opacity: 0.12 },
            ]}
          />
          <View
            style={[
              s.decCircle,
              { width: 80, height: 80, top: 10, right: 60, opacity: 0.08 },
            ]}
          />

          <View style={s.heroContent}>
            <View style={s.heroIconWrap}>
              <Ionicons name="alert-circle" size={26} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Request Help</Text>
              <Text style={s.heroSub}>
                Emergency assistance when you need it
              </Text>
            </View>
          </View>

          {/* Step chips */}
          <View style={s.stepRow}>
            {["Location", "Category", "Details"].map((label, i) => {
              const done =
                (i === 0 && pinnedLocation) ||
                (i === 1 && form.category) ||
                (i === 2 && form.description);
              return (
                <View key={label} style={[s.stepChip, done && s.stepChipDone]}>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={13} color="#fff" />
                  ) : (
                    <View style={s.stepDot} />
                  )}
                  <Text style={s.stepLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </LinearGradient>

        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ══ LOCATION ═════════════════════════════════════════════════════ */}
          <View style={s.section}>
            <Label text="Location" icon="location-outline" />
            <View style={s.card}>
              {/* Address display */}
              <View style={s.locDisplay}>
                <LinearGradient
                  colors={["#3b82f6", "#6366f1"]}
                  style={s.locDisplayIcon}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.locDisplayTitle} numberOfLines={2}>
                    {form.address || "Belum ada lokasi dipilih"}
                  </Text>
                  <Text style={s.locDisplaySub}>
                    {pinnedLocation
                      ? "✅  Koordinat terdeteksi"
                      : "Tap tombol di bawah untuk memilih"}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={s.divider} />

              {/* Buttons */}
              <View style={s.locBtns}>
                <TouchableOpacity
                  style={s.locBtn}
                  onPress={handleGetLocation}
                  disabled={locationLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#3b82f6", "#6366f1"]}
                    style={s.locBtnGrad}
                  >
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="locate" size={16} color="#fff" />
                    )}
                    <Text style={s.locBtnText}>Deteksi Otomatis</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.locBtnOutline}
                  onPress={() => setShowMapModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map-outline" size={16} color="#8b5cf6" />
                  <Text style={s.locBtnOutlineText}>Pilih di Peta</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ══ CATEGORY ═════════════════════════════════════════════════════ */}
          <View style={s.section}>
            <Label text="Kategori Bantuan" icon="grid-outline" required />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.catRow}
            >
              {CATEGORIES.map((cat) => {
                const active = form.category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setForm({ ...form, category: cat.key })}
                    activeOpacity={0.8}
                  >
                    {active ? (
                      <LinearGradient
                        colors={[cat.color, cat.color]}
                        style={s.catPillActive}
                      >
                        <Ionicons name={cat.icon} size={14} color="#fff" />
                        <Text style={s.catPillTextActive}>{cat.label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={s.catPill}>
                        <Ionicons name={cat.icon} size={14} color="#64748b" />
                        <Text style={s.catPillText}>{cat.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ══ NUMBER OF PEOPLE ═════════════════════════════════════════════ */}
          <View style={s.section}>
            <Label
              text="Jumlah Orang Terdampak"
              icon="people-outline"
              required
            />
            <View style={s.card}>
              <View style={s.peopleCounter}>
                <TouchableOpacity
                  onPress={() =>
                    setForm({
                      ...form,
                      numberOfPeople: String(
                        Math.max(1, parseInt(form.numberOfPeople || 1) - 1),
                      ),
                    })
                  }
                  style={s.counterBtn}
                >
                  <LinearGradient
                    colors={["#fef2f2", "#fee2e2"]}
                    style={s.counterBtnGrad}
                  >
                    <Ionicons name="remove" size={16} color="#ef4444" />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={s.counterDisplay}>
                  <TextInput
                    style={s.counterNum}
                    keyboardType="numeric"
                    value={form.numberOfPeople}
                    onChangeText={(t) =>
                      setForm({ ...form, numberOfPeople: t })
                    }
                    textAlign="center"
                  />
                  <Text style={s.counterUnit}>orang</Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setForm({
                      ...form,
                      numberOfPeople: String(
                        parseInt(form.numberOfPeople || 1) + 1,
                      ),
                    })
                  }
                  style={s.counterBtn}
                >
                  <LinearGradient
                    colors={["#ef4444", "#f97316"]}
                    style={s.counterBtnGrad}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={s.divider} />

              <View style={s.quickPick}>
                <Text style={s.quickPickLabel}>Pilih cepat:</Text>
                {[1, 5, 10, 25, 50, 100].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() =>
                      setForm({ ...form, numberOfPeople: String(n) })
                    }
                    style={[
                      s.quickNum,
                      form.numberOfPeople === String(n) && s.quickNumActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.quickNumText,
                        form.numberOfPeople === String(n) && {
                          color: "#ef4444",
                        },
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ══ DESCRIPTION ══════════════════════════════════════════════════ */}
          <View style={s.section}>
            <Label
              text="Deskripsi Situasi"
              icon="document-text-outline"
              required
            />
            <View style={s.card}>
              <TextInput
                style={s.textarea}
                placeholder="Ceritakan situasi darurat yang kamu alami secara detail...&#10;&#10;Contoh: Rumah kami kebanjiran setinggi 1 meter, kami membutuhkan perahu dan makanan untuk 5 orang."
                placeholderTextColor="#c0ccda"
                multiline
                value={form.description}
                onChangeText={(t) =>
                  setForm({ ...form, description: t.slice(0, 500) })
                }
                textAlignVertical="top"
              />
              <View style={s.charRow}>
                <View style={s.charTrack}>
                  <LinearGradient
                    colors={
                      form.description.length > 400
                        ? ["#f97316", "#ef4444"]
                        : ["#ef4444", "#f97316"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      s.charFill,
                      { width: `${(form.description.length / 500) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={s.charCount}>{form.description.length}/500</Text>
              </View>
            </View>
          </View>

          {/* ══ PHOTOS ═══════════════════════════════════════════════════════ */}
          <View style={s.section}>
            <Label
              text="Foto Kondisi"
              icon="camera-outline"
              hint="Opsional · Maks. 4 foto"
            />
            <View style={s.card}>
              <View style={s.photoGrid}>
                {photos.map((photo, i) => (
                  <View key={i} style={s.photoWrap}>
                    <Image source={{ uri: photo.uri }} style={s.photoImg} />
                    {photo.uploading ? (
                      <View style={s.photoOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text
                          style={{ fontSize: 10, color: "#fff", marginTop: 4 }}
                        >
                          Uploading...
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.photoRemove}
                        onPress={() => handleRemovePhoto(i)}
                      >
                        <View style={s.photoRemoveBtn}>
                          <Ionicons name="close" size={11} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {photos.length < 4 && !photos.some((p) => p.uploading) && (
                  <>
                    <TouchableOpacity
                      style={s.addPhoto}
                      onPress={handlePickCamera}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={["#eff6ff", "#dbeafe"]}
                        style={s.addPhotoInner}
                      >
                        <Ionicons name="camera" size={18} color="#3b82f6" />
                        <Text style={s.addPhotoText}>Kamera</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.addPhoto}
                      onPress={handlePickGallery}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={["#f5f3ff", "#ede9fe"]}
                        style={s.addPhotoInner}
                      >
                        <Ionicons
                          name="image-outline"
                          size={18}
                          color="#8b5cf6"
                        />
                        <Text style={[s.addPhotoText, { color: "#8b5cf6" }]}>
                          Galeri
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                {photos.length === 0 && (
                  <Text style={s.photoHint}>
                    Foto membantu volunteer memahami situasimu lebih baik
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={{ height: 100 + insets.bottom }} />
        </ScrollView>

        {/* ══ SUBMIT ═══════════════════════════════════════════════════════ */}
        <View style={[s.submitBar, { paddingBottom: insets.bottom + 4 }]}>
          {!isValid && (
            <View style={s.validHint}>
              <Ionicons name="alert-circle-outline" size={13} color="#f97316" />
              <Text style={s.validHintText}>
                {!pinnedLocation
                  ? "📍 Pilih lokasi terlebih dahulu"
                  : !form.category
                  ? "👆 Pilih kategori bantuan terlebih dahulu"
                  : "✏️ Tambahkan deskripsi situasimu"}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid || loading}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={
                isValid
                  ? ["#c0392b", "#e74c3c", "#f97316"]
                  : ["#e2e8f0", "#e2e8f0"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View
                    style={[
                      s.submitIconBox,
                      {
                        backgroundColor: isValid
                          ? "rgba(255,255,255,0.2)"
                          : "#cbd5e1",
                      },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={15}
                      color={isValid ? "#fff" : "#94a3b8"}
                    />
                  </View>
                  <Text
                    style={[s.submitText, !isValid && { color: "#94a3b8" }]}
                  >
                    Submit Emergency Request
                  </Text>
                  <Ionicons
                    name="send"
                    size={13}
                    color={isValid ? "#fff" : "#94a3b8"}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ══ MAP MODAL ════════════════════════════════════════════════════════ */}
      <Modal visible={showMapModal} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <LinearGradient
            colors={["#c0392b", "#e74c3c", "#f97316"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.mapHeader}
          >
            <TouchableOpacity
              style={s.mapBack}
              onPress={() => setShowMapModal(false)}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.mapTitle}>Pilih Lokasi</Text>
            <View style={{ width: 36 }} />
          </LinearGradient>

          <View style={s.mapSearch}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput
              style={s.mapSearchInput}
              placeholder="Cari alamat atau nama tempat..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchLocation}
              returnKeyType="search"
            />
            {searchLoading ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <TouchableOpacity
                onPress={handleSearchLocation}
                style={s.mapSearchGo}
              >
                <LinearGradient
                  colors={["#ef4444", "#f97316"]}
                  style={s.mapSearchGoGrad}
                >
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {suggestions.length > 0 && (
            <View style={s.suggestionBox}>
              {suggestions.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.suggestionItem,
                    i < suggestions.length - 1 && s.suggestionDivider,
                  ]}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Ionicons name="location-outline" size={14} color="#ef4444" />
                  <Text style={s.suggestionText} numberOfLines={2}>
                    {item.text?.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {suggestions.length === 0 && (
            <View style={s.mapHintBar}>
              <Ionicons
                name="information-circle-outline"
                size={13}
                color="#3b82f6"
              />
              <Text style={s.mapHintText}>Tap di peta untuk memilih lokasi</Text>
            </View>
          )}

          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
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
              <Marker coordinate={pinnedLocation} pinColor="#ef4444" />
            )}
          </MapView>

          <View style={[s.mapBottom, { paddingBottom: insets.bottom + 16 }]}>
            {mapLoading ? (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 20,
                }}
              >
                <ActivityIndicator size="small" color="#ef4444" />
                <Text style={{ color: "#64748b", fontSize: 13 }}>
                  Mendeteksi alamat...
                </Text>
              </View>
            ) : pinnedLocation ? (
              <>
                <View style={s.mapAddr}>
                  <LinearGradient
                    colors={["#fef2f2", "#fee2e2"]}
                    style={s.mapAddrIcon}
                  >
                    <Ionicons name="location" size={16} color="#ef4444" />
                  </LinearGradient>
                  <Text style={s.mapAddrText} numberOfLines={2}>
                    {form.address || "Alamat terdeteksi..."}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowMapModal(false)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#c0392b", "#e74c3c", "#f97316"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.mapConfirm}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.mapConfirmText}>Konfirmasi Lokasi Ini</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 20,
                }}
              >
                <Ionicons name="hand-left-outline" size={22} color="#cbd5e1" />
                <Text style={{ color: "#94a3b8", fontSize: 13 }}>
                  Tap di peta untuk memilih lokasi
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Label({ icon, text, required, hint }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={16} color="#ef4444" />
      </View>
      <Text style={s.labelText}>
        {text}
        {required && <Text style={{ color: "#ef4444" }}> *</Text>}
      </Text>
      {hint && <Text style={s.labelHint}>{hint}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { flex: 1 },

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  successRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  successCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 10,
  },
  successSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
  },

  // ── HERO HEADER ──────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    overflow: "hidden",
  },
  decCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  heroSub: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  stepRow: { flexDirection: "row", gap: 6 },
  stepChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepChipDone: { backgroundColor: "rgba(255,255,255,0.35)" },
  stepDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  stepLabel: { fontSize: 10, fontWeight: "700", color: "#fff" },

  // ── SECTION ──────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, paddingTop: 14 },
  labelText: { fontSize: 13, fontWeight: "700", color: "#0f172a", flex: 1 },
  labelHint: { fontSize: 11, color: "#94a3b8" },

  // ── CARD ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 10 },

  // ── LOCATION ─────────────────────────────────────────────────────────────
  locDisplay: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  locDisplayIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  locDisplayTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: 17,
  },
  locDisplaySub: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  locBtns: { flexDirection: "row", gap: 8 },
  locBtn: { flex: 1, borderRadius: 10, overflow: "hidden" },
  locBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
  },
  locBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  locBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    backgroundColor: "#faf5ff",
  },
  locBtnOutlineText: { fontSize: 12, fontWeight: "700", color: "#8b5cf6" },

  // ── CATEGORY ─────────────────────────────────────────────────────────────
  catRow: { gap: 8, paddingBottom: 2 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: "#f1f5f9",
  },
  catPillActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
  },
  catPillText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  catPillTextActive: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // ── PEOPLE COUNTER ────────────────────────────────────────────────────────
  peopleCounter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterBtn: { borderRadius: 12, overflow: "hidden" },
  counterBtnGrad: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  counterDisplay: { alignItems: "center" },
  counterNum: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    minWidth: 70,
    paddingVertical: 0,
  },
  counterUnit: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginTop: -2,
  },
  quickPick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  quickPickLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  quickNum: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  quickNumActive: { borderColor: "#ef4444", backgroundColor: "#fef2f2" },
  quickNumText: { fontSize: 12, fontWeight: "700", color: "#64748b" },

  // ── DESCRIPTION ──────────────────────────────────────────────────────────
  textarea: {
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 20,
    minHeight: 90,
    textAlignVertical: "top",
  },
  charRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  charTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#f1f5f9",
    borderRadius: 2,
    overflow: "hidden",
  },
  charFill: { height: "100%", borderRadius: 2 },
  charCount: { fontSize: 10, color: "#94a3b8", width: 40, textAlign: "right" },

  // ── PHOTOS ───────────────────────────────────────────────────────────────
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: { width: 68, height: 68, position: "relative" },
  photoImg: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemove: { position: "absolute", top: -4, right: -4 },
  photoRemoveBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  addPhoto: { width: 68, height: 68, borderRadius: 12, overflow: "hidden" },
  addPhotoInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#bfdbfe",
    borderStyle: "dashed",
  },
  addPhotoText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#3b82f6",
    textAlign: "center",
  },
  photoHint: { fontSize: 11, color: "#94a3b8", flex: 1, paddingLeft: 4 },

  // ── SUBMIT BAR ────────────────────────────────────────────────────────────
  submitBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(241,245,249,0.97)",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  validHint: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    marginBottom: 8,
  },
  validHintText: { fontSize: 12, color: "#f97316", fontWeight: "500" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // ── MAP MODAL ─────────────────────────────────────────────────────────────
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  mapBack: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: { fontSize: 16, fontWeight: "800", color: "#fff" },
  mapSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    paddingVertical: 12,
  },
  mapSearchGo: { overflow: "hidden", borderRadius: 8 },
  mapSearchGoGrad: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mapHintBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapHintText: { fontSize: 12, color: "#3b82f6", fontWeight: "600" },
  mapBottom: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  mapAddr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  mapAddrIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mapAddrText: {
    fontSize: 13,
    color: "#0f172a",
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
  mapConfirm: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mapConfirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // ── MAP SUGGESTIONS ──────────────────────────────────────────────────────
  markerWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionBox: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  suggestionText: {
    fontSize: 13,
    color: "#0f172a",
    flex: 1,
    lineHeight: 18,
  },
});
