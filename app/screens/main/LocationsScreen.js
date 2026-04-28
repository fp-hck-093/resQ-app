import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
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
import { useQuery, useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const GET_LOCATIONS = gql`
  query GetMyLocations {
    getMyLocations {
      _id
      userId
      address
      city
      province
      country
      notificationRadius
      location {
        type
        coordinates
      }
      createdAt
    }
  }
`;

const ADD_LOCATION = gql`
  mutation AddLocation($input: CreateLocationInput!) {
    addLocation(input: $input) {
      _id
      address
      city
    }
  }
`;

const DELETE_LOCATION = gql`
  mutation DeleteLocation($locationId: String!) {
    deleteLocation(locationId: $locationId)
  }
`;

export default function LocationsScreen() {
  const insets = useSafeAreaInsets();
  const mapSearchRef = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showViewMapModal, setShowViewMapModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [viewMapLocation, setViewMapLocation] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({
    address: "",
    city: "",
    province: "",
    country: "Indonesia",
    keterangan: "",
  });

  const { data, loading, refetch } = useQuery(GET_LOCATIONS);

  const [addLocation, { loading: addLoading }] = useMutation(ADD_LOCATION, {
    onCompleted: () => {
      refetch();
      setShowAddModal(false);
      setPinnedLocation(null);
      setForm({
        address: "",
        city: "",
        province: "",
        country: "Indonesia",
        keterangan: "",
      });
    },
    onError: (e) => console.log("Add location error:", e.message),
  });

  const [deleteLocation] = useMutation(DELETE_LOCATION, {
    onCompleted: () => refetch(),
  });

  const locations = data?.getMyLocations || [];

  const handleDetectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geocode.length > 0) {
        const loc = geocode[0];
        setForm({
          ...form,
          address: `${loc.street || ""} ${loc.district || ""}`.trim(),
          city: loc.city || loc.subregion || "",
          province: loc.region || "",
          country: loc.country || "Indonesia",
        });
        setPinnedLocation({ latitude, longitude });
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
          address: `${loc.street || ""} ${loc.district || ""}`.trim(),
          city: loc.city || loc.subregion || "",
          province: loc.region || "",
          country: loc.country || "Indonesia",
        });
      }
    } catch (e) {
      console.log("Geocode error:", e);
    } finally {
      setMapLoading(false);
    }
  };

  const handleAddLocation = () => {
    if (!form.address || !form.city || !form.province || !form.keterangan)
      return;
    addLocation({
      variables: {
        input: {
          coordinates: pinnedLocation
            ? [pinnedLocation.longitude, pinnedLocation.latitude]
            : [106.8456, -6.2088],
          address: `${form.keterangan} - ${form.address}`,
          city: form.city,
          province: form.province,
          country: form.country || "Indonesia",
          notifyOnNewRequests: true,
          notifyOnDangerZones: true,
        },
      },
    });
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      deleteLocation({ variables: { locationId: id } });
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleViewOnMap = (loc) => {
    if (loc.location?.coordinates) {
      const [longitude, latitude] = loc.location.coordinates;
      setViewMapLocation({ latitude, longitude });
      setShowViewMapModal(true);
    }
  };

  const handleOpenGoogleMaps = (latitude, longitude) => {
    Linking.openURL(`https://www.google.com/maps?q=${latitude},${longitude}`);
  };

  const isFormValid =
    form.address && form.city && form.province && form.keterangan;

  const closeAddModal = () => {
    setShowAddModal(false);
    setPinnedLocation(null);
    setForm({
      address: "",
      city: "",
      province: "",
      country: "Indonesia",
      keterangan: "",
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* HEADER */}
      <LinearGradient
        colors={["#3b5fca", "#5b7ee5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <View style={s.headerIcon}>
          <Ionicons name="location" size={22} color="#3b5fca" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Saved Locations</Text>
          <Text style={s.headerSub}>{locations.length} lokasi tersimpan</Text>
        </View>
        <TouchableOpacity
          style={s.headerAddBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* LIST */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#3b5fca" />
          <Text style={s.loadingText}>Memuat lokasi...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        >
          {locations.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="location-outline" size={40} color="#3b5fca" />
              </View>
              <Text style={s.emptyTitle}>Belum Ada Lokasi</Text>
              <Text style={s.emptyDesc}>
                Tambahkan lokasi untuk memantau situasi di area tersebut
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.emptyBtnText}>Tambah Lokasi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            locations.map((loc, index) => {
              const title = loc.address?.split(" - ")[0] || loc.city;
              const addr = loc.address?.split(" - ")[1] || loc.address;
              return (
                <View key={loc._id} style={s.card}>
                  {/* Card Top */}
                  <View style={s.cardTop}>
                    <View
                      style={[
                        s.cardDot,
                        index === 0 && { backgroundColor: "#3b5fca" },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={s.cardTitleRow}>
                        <Text style={s.cardTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {index === 0 && (
                          <View style={s.primaryBadge}>
                            <Text style={s.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.cardAddrRow}>
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#94a3b8"
                        />
                        <Text style={s.cardAddr} numberOfLines={1}>
                          {addr}, {loc.city}, {loc.province}
                        </Text>
                      </View>
                    </View>
                    <View style={s.cardActions}>
                      <TouchableOpacity
                        style={s.mapBtn}
                        onPress={() => handleViewOnMap(loc)}
                      >
                        <Ionicons name="map-outline" size={14} color="#3b5fca" />
                        <Text style={s.mapBtnText}>Lihat di Peta</Text>
                      </TouchableOpacity>
                      {confirmDeleteId === loc._id ? (
                        <View style={s.confirmRow}>
                          <TouchableOpacity
                            style={s.confirmCancel}
                            onPress={() => setConfirmDeleteId(null)}
                          >
                            <Text style={s.confirmCancelText}>Batal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.confirmDelete}
                            onPress={() => handleDelete(loc._id)}
                          >
                            <Text style={s.confirmDeleteText}>Hapus</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleDelete(loc._id)}
                          style={s.deleteBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ ADD MODAL ══════════════════════════════════════════════════════ */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayBg} onPress={closeAddModal} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.handle} />

            {/* Modal Header */}
            <View style={s.sheetHeader}>
              <View style={s.sheetHeaderIcon}>
                <Ionicons name="location" size={18} color="#3b5fca" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetTitle}>Tambah Lokasi</Text>
                <Text style={s.sheetSub}>
                  Isi detail lokasi yang ingin dipantau
                </Text>
              </View>
              <TouchableOpacity onPress={closeAddModal} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Nama Lokasi */}
              <Field
                label="Nama Lokasi"
                required
                hint="Contoh: Rumah Orang Tua, Kantor..."
              >
                <TextInput
                  style={s.input}
                  placeholder="Nama atau keterangan lokasi"
                  placeholderTextColor="#c0ccda"
                  value={form.keterangan}
                  onChangeText={(t) => setForm({ ...form, keterangan: t })}
                />
              </Field>

              {/* Detect & Map */}
              <View style={s.locBtns}>
                <TouchableOpacity
                  style={s.locBtnBlue}
                  onPress={handleDetectLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="locate" size={15} color="#fff" />
                  )}
                  <Text style={s.locBtnBlueText}>Deteksi Otomatis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.locBtnOutline}
                  onPress={() => setShowMapModal(true)}
                >
                  <Ionicons name="map-outline" size={15} color="#8b5cf6" />
                  <Text style={s.locBtnOutlineText}>Pilih di Peta</Text>
                </TouchableOpacity>
              </View>

              {pinnedLocation && (
                <View style={s.pinnedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <Text style={s.pinnedText}>
                    {form.address || "Koordinat berhasil dipilih"}
                  </Text>
                </View>
              )}

              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>detail alamat</Text>
                <View style={s.orLine} />
              </View>

              <Field label="Alamat" required hint="Nama jalan atau patokan">
                <TextInput
                  style={s.input}
                  placeholder="Jl. Sudirman No. 1..."
                  placeholderTextColor="#c0ccda"
                  value={form.address}
                  onChangeText={(t) => setForm({ ...form, address: t })}
                />
              </Field>

              <View style={s.row2}>
                <View style={{ flex: 1 }}>
                  <Field label="Kota" required>
                    <TextInput
                      style={s.input}
                      placeholder="Jakarta..."
                      placeholderTextColor="#c0ccda"
                      value={form.city}
                      onChangeText={(t) => setForm({ ...form, city: t })}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Provinsi" required>
                    <TextInput
                      style={s.input}
                      placeholder="DKI Jakarta..."
                      placeholderTextColor="#c0ccda"
                      value={form.province}
                      onChangeText={(t) => setForm({ ...form, province: t })}
                    />
                  </Field>
                </View>
              </View>

              <Field label="Negara">
                <TextInput
                  style={s.input}
                  placeholder="Indonesia"
                  placeholderTextColor="#c0ccda"
                  value={form.country}
                  onChangeText={(t) => setForm({ ...form, country: t })}
                />
              </Field>
            </ScrollView>

            <TouchableOpacity
              onPress={handleAddLocation}
              disabled={!isFormValid || addLoading}
              activeOpacity={0.85}
              style={[s.submitWrap, !isFormValid && { opacity: 0.55 }]}
            >
              <LinearGradient
                colors={
                  isFormValid ? ["#3b5fca", "#5b7ee5"] : ["#cbd5e1", "#cbd5e1"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.submitBtn}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <View style={s.submitIconBox}>
                      <Ionicons
                        name="location"
                        size={18}
                        color={isFormValid ? "#3b5fca" : "#94a3b8"}
                      />
                    </View>
                    <Text style={s.submitText}>Simpan Lokasi</Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="rgba(255,255,255,0.7)"
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ MAP PICKER MODAL ═══════════════════════════════════════════════ */}
      <Modal visible={showMapModal} animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <LinearGradient
            colors={["#3b5fca", "#5b7ee5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.mapHeader}
          >
            <TouchableOpacity
              style={s.mapBackBtn}
              onPress={() => setShowMapModal(false)}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.mapTitle}>Pilih Lokasi</Text>
            <View style={{ width: 36 }} />
          </LinearGradient>

          <View style={s.mapHint}>
            <Ionicons name="hand-left-outline" size={13} color="#3b5fca" />
            <Text style={s.mapHintText}>Tap di peta untuk memilih lokasi</Text>
          </View>

          <MapView
            ref={mapSearchRef}
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
              <Marker coordinate={pinnedLocation} pinColor="#3b5fca" />
            )}
          </MapView>

          <View style={[s.mapBottom, { paddingBottom: insets.bottom + 16 }]}>
            {mapLoading ? (
              <View style={s.mapLoadingRow}>
                <ActivityIndicator size="small" color="#3b5fca" />
                <Text style={s.mapLoadingText}>Mendeteksi alamat...</Text>
              </View>
            ) : pinnedLocation ? (
              <>
                <View style={s.mapAddrCard}>
                  <Ionicons name="location" size={16} color="#3b5fca" />
                  <Text style={s.mapAddrText} numberOfLines={2}>
                    {form.address
                      ? `${form.address}, ${form.city}, ${form.province}`
                      : "Alamat terdeteksi..."}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowMapModal(false)}>
                  <LinearGradient
                    colors={["#3b5fca", "#5b7ee5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.mapConfirmBtn}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={s.mapConfirmText}>Konfirmasi Lokasi</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.mapEmptyState}>
                <Ionicons name="map-outline" size={24} color="#cbd5e1" />
                <Text style={s.mapEmptyText}>
                  Tap di peta untuk memilih lokasi
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ══ VIEW MAP MODAL ═════════════════════════════════════════════════ */}
      <Modal
        visible={showViewMapModal}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <LinearGradient
            colors={["#3b5fca", "#5b7ee5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.mapHeader}
          >
            <TouchableOpacity
              style={s.mapBackBtn}
              onPress={() => setShowViewMapModal(false)}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.mapTitle}>Lokasi Tersimpan</Text>
            <View style={{ width: 36 }} />
          </LinearGradient>

          {viewMapLocation && (
            <MapView
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                ...viewMapLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
              mapPadding={{ bottom: 90 }}
              zoomEnabled
              scrollEnabled
            >
              <Marker coordinate={viewMapLocation} pinColor="#3b5fca" />
            </MapView>
          )}

          <View style={[s.mapBottom, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              onPress={() =>
                handleOpenGoogleMaps(
                  viewMapLocation?.latitude,
                  viewMapLocation?.longitude,
                )
              }
            >
              <LinearGradient
                colors={["#3b5fca", "#5b7ee5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.mapConfirmBtn}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={s.mapConfirmText}>Buka di Google Maps</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={{ color: "#ef4444" }}> *</Text>}
      </Text>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  scroll: { flex: 1 },
  listContent: { padding: 16 },

  // ── HEADER ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 1 },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── STATES ───────────────────────────────────────────────────────────────
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#64748b", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  emptyDesc: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3b5fca",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 6,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // ── LOCATION CARD ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    paddingBottom: 12,
  },
  cardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    backgroundColor: "#e2e8f0",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", flex: 1 },
  primaryBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: "700", color: "#3b5fca" },
  cardAddrRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardAddr: { fontSize: 12, color: "#94a3b8", flex: 1 },
  deleteBtn: { padding: 4 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  confirmCancel: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  confirmCancelText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  confirmDelete: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  confirmDeleteText: { fontSize: 11, fontWeight: "700", color: "#ef4444" },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapBtnText: { fontSize: 12, fontWeight: "600", color: "#3b5fca" },

  // ── SHEET (Add Modal) ─────────────────────────────────────────────────────
  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "92%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  sheetSub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── FORM ─────────────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  fieldHint: { fontSize: 11, color: "#94a3b8", marginBottom: 6 },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
  },
  row2: { flexDirection: "row", gap: 10 },
  locBtns: { flexDirection: "row", gap: 10, marginBottom: 12 },
  locBtnBlue: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3b5fca",
    borderRadius: 12,
    paddingVertical: 11,
  },
  locBtnBlueText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  locBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    backgroundColor: "#faf5ff",
  },
  locBtnOutlineText: { fontSize: 12, fontWeight: "700", color: "#8b5cf6" },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  pinnedText: { fontSize: 12, color: "#22c55e", fontWeight: "600", flex: 1 },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  orText: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  submitWrap: {
    marginTop: 12,
    borderRadius: 18,
    shadowColor: "#3b5fca",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    paddingVertical: 17,
  },
  submitIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },

  // ── MAP MODAL ─────────────────────────────────────────────────────────────
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  mapBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    borderRadius: 12,
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
  mapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapHintText: { fontSize: 12, color: "#3b5fca", fontWeight: "600" },
  mapBottom: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  mapLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  mapLoadingText: { fontSize: 13, color: "#64748b" },
  mapAddrCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  mapAddrText: {
    fontSize: 13,
    color: "#0f172a",
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },
  mapConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  mapConfirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  mapEmptyState: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  mapEmptyText: { fontSize: 13, color: "#94a3b8" },

  markerWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
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
