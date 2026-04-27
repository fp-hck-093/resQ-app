import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
      notifyOnNewRequests
      notifyOnDangerZones
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
      notifyOnNewRequests
      notifyOnDangerZones
    }
  }
`;

const UPDATE_LOCATION = gql`
  mutation UpdateLocation($input: UpdateLocationInput!) {
    updateLocation(input: $input) {
      _id
      notifyOnNewRequests
      notifyOnDangerZones
    }
  }
`;

const DELETE_LOCATION = gql`
  mutation DeleteLocation($locationId: String!) {
    deleteLocation(locationId: $locationId)
  }
`;

export default function LocationsScreen() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showViewMapModal, setShowViewMapModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(null);
  const [viewMapLocation, setViewMapLocation] = useState(null);
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

  const [updateLocation] = useMutation(UPDATE_LOCATION, {
    onCompleted: () => refetch(),
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
    const coordinates = pinnedLocation
      ? [pinnedLocation.longitude, pinnedLocation.latitude]
      : [106.8456, -6.2088];

    addLocation({
      variables: {
        input: {
          coordinates,
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

  const handleToggleNotif = (id, current) => {
    updateLocation({
      variables: {
        input: {
          locationId: id,
          notifyOnNewRequests: !current,
          notifyOnDangerZones: !current,
        },
      },
    });
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Hapus Lokasi",
      "Apakah kamu yakin ingin menghapus lokasi ini?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => deleteLocation({ variables: { locationId: id } }),
        },
      ],
    );
  };

  const handleViewOnMap = (loc) => {
    if (loc.location?.coordinates) {
      const [longitude, latitude] = loc.location.coordinates;
      setViewMapLocation({ latitude, longitude });
      setShowViewMapModal(true);
    }
  };

  const handleOpenGoogleMaps = (latitude, longitude) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const isFormValid =
    form.address && form.city && form.province && form.keterangan;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* HEADER */}
      <LinearGradient colors={["#3b5fca", "#5b7ee5"]} style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Ionicons name="location" size={20} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Saved Locations</Text>
          <Text style={styles.headerSubtitle}>
            Monitor multiple locations for requests and alerts
          </Text>
        </View>
      </LinearGradient>

      {/* ADD BUTTON */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={20} color="#3b5fca" />
        <Text style={styles.addBtnText}>Add New Location</Text>
      </TouchableOpacity>

      {/* LOCATIONS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5fca" />
          <Text style={styles.loadingText}>Memuat lokasi...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {locations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="location-outline" size={48} color="#3b5fca" />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Lokasi</Text>
              <Text style={styles.emptyDesc}>
                Tambahkan lokasi untuk memantau situasi di area tersebut
              </Text>
            </View>
          ) : (
            locations.map((loc, index) => (
              <View key={loc._id} style={styles.locationCard}>
                <View style={styles.locationCardHeader}>
                  <View style={styles.locationCardTitleRow}>
                    <Text style={styles.locationCardTitle} numberOfLines={1}>
                      {loc.address?.split(" - ")[0] || loc.city}
                    </Text>
                    {index === 0 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(loc._id)}>
                    <Ionicons name="trash-outline" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <View style={styles.locationAddressRow}>
                  <Ionicons name="location-outline" size={13} color="#94a3b8" />
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {loc.address?.split(' - ')[1] || loc.address}, {loc.city}, {loc.province}
                  </Text>
                </View>

                <View style={styles.locationStatsRow}>
                  <View style={styles.locationStat}>
                    <Text style={styles.locationStatNumber}>0</Text>
                    <Text style={styles.locationStatLabel}>
                      Active Requests
                    </Text>
                  </View>
                  <View
                    style={[styles.dangerLevel, { backgroundColor: "#fef2f2" }]}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={14}
                      color="#ef4444"
                    />
                    <Text
                      style={[styles.dangerLevelText, { color: "#ef4444" }]}
                    >
                      Unknown
                    </Text>
                  </View>
                </View>

                <View style={styles.notifRow}>
                  <View style={styles.notifLeft}>
                    <Ionicons
                      name="notifications-outline"
                      size={16}
                      color="#64748b"
                    />
                    <View>
                      <Text style={styles.notifLabel}>Notifications</Text>
                      <Text style={styles.notifSub}>
                        {loc.notificationRadius || 10}km radius
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={loc.notifyOnNewRequests}
                    onValueChange={() =>
                      handleToggleNotif(loc._id, loc.notifyOnNewRequests)
                    }
                    trackColor={{ false: "#e2e8f0", true: "#3b5fca" }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleViewOnMap(loc)}
                  >
                    <Ionicons name="map-outline" size={14} color="#3b5fca" />
                    <Text style={styles.actionBtnText}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* INFO CARD */}
          <View style={styles.infoCard}>
            <Ionicons name="bulb-outline" size={20} color="#f97316" />
            <View style={styles.infoCardText}>
              <Text style={styles.infoCardTitle}>Monitor from anywhere</Text>
              <Text style={styles.infoCardDesc}>
                Get notified about requests and danger zones in your saved
                locations, even when you're far away.
              </Text>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ADD LOCATION MODAL */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Location</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setPinnedLocation(null);
                  setForm({
                    address: "",
                    city: "",
                    province: "",
                    country: "Indonesia",
                    keterangan: "",
                  });
                }}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* KETERANGAN */}
              <Text style={styles.inputLabel}>
                Keterangan <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.inputHint}>
                Nama atau deskripsi lokasi ini untuk kamu
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rumah Orang Tua, Kantor, Kampung Halaman..."
                placeholderTextColor="#94a3b8"
                value={form.keterangan}
                onChangeText={(text) => setForm({ ...form, keterangan: text })}
              />

              {/* DETECT & MAP BUTTONS */}
              <View style={styles.locationBtnsRow}>
                <TouchableOpacity
                  style={styles.detectLocationBtn}
                  onPress={handleDetectLocation}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#3b5fca" />
                  ) : (
                    <Ionicons name="locate" size={16} color="#3b5fca" />
                  )}
                  <Text style={styles.detectLocationText}>
                    {locationLoading ? "Mendeteksi..." : "Deteksi Otomatis"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapPickerBtn}
                  onPress={() => setShowMapModal(true)}
                >
                  <Ionicons name="map" size={16} color="#8b5cf6" />
                  <Text style={styles.mapPickerText}>Pilih lewat Peta</Text>
                </TouchableOpacity>
              </View>

              {/* PINNED LOCATION PREVIEW */}
              {pinnedLocation && (
                <View style={styles.pinnedPreview}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.pinnedPreviewText}>
                    Lokasi dipilih: {form.address || "Koordinat terdeteksi"}
                  </Text>
                </View>
              )}

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>detail alamat</Text>
                <View style={styles.orLine} />
              </View>

              <Text style={styles.inputLabel}>
                Alamat <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.inputHint}>
                Nama jalan atau patokan lokasi
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Jl. Sudirman No. 1..."
                placeholderTextColor="#94a3b8"
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
              />

              <Text style={styles.inputLabel}>
                Kota <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.inputHint}>Nama kota atau kabupaten</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Jakarta Selatan..."
                placeholderTextColor="#94a3b8"
                value={form.city}
                onChangeText={(text) => setForm({ ...form, city: text })}
              />

              <Text style={styles.inputLabel}>
                Provinsi <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.inputHint}>
                Nama provinsi tempat lokasi berada
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. DKI Jakarta..."
                placeholderTextColor="#94a3b8"
                value={form.province}
                onChangeText={(text) => setForm({ ...form, province: text })}
              />

              <Text style={styles.inputLabel}>Negara</Text>
              <TextInput
                style={styles.input}
                placeholder="Indonesia"
                placeholderTextColor="#94a3b8"
                value={form.country}
                onChangeText={(text) => setForm({ ...form, country: text })}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, !isFormValid && { opacity: 0.5 }]}
              onPress={handleAddLocation}
              disabled={!isFormValid || addLoading}
            >
              <LinearGradient
                colors={
                  isFormValid ? ["#3b5fca", "#5b7ee5"] : ["#94a3b8", "#94a3b8"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {addLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Add Location</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MAP PICKER MODAL */}
      <Modal visible={showMapModal} animationType="slide" statusBarTranslucent>
        <View style={styles.mapPickerContainer}>
          <View style={styles.mapPickerHeader}>
            <TouchableOpacity
              style={styles.mapPickerCloseBtn}
              onPress={() => setShowMapModal(false)}
            >
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.mapPickerTitle}>Pilih Lokasi</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.mapPickerHint}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#3b5fca"
            />
            <Text style={styles.mapPickerHintText}>
              Tap di peta untuk memilih lokasi
            </Text>
          </View>

          <MapView
            style={styles.mapPickerMap}
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

          <View style={styles.mapPickerBottom}>
            {mapLoading ? (
              <View style={styles.mapPickerLoading}>
                <ActivityIndicator size="small" color="#3b5fca" />
                <Text style={styles.mapPickerLoadingText}>
                  Mendeteksi alamat...
                </Text>
              </View>
            ) : pinnedLocation ? (
              <View>
                <View style={styles.mapPickerAddressRow}>
                  <Ionicons name="location" size={16} color="#3b5fca" />
                  <Text style={styles.mapPickerAddress} numberOfLines={2}>
                    {form.address
                      ? `${form.address}, ${form.city}, ${form.province}`
                      : "Alamat terdeteksi..."}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.mapPickerConfirmBtn}
                  onPress={() => setShowMapModal(false)}
                >
                  <LinearGradient
                    colors={["#3b5fca", "#5b7ee5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mapPickerConfirmGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.mapPickerConfirmText}>
                      Konfirmasi Lokasi
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.mapPickerEmpty}>
                <Ionicons name="hand-left-outline" size={24} color="#94a3b8" />
                <Text style={styles.mapPickerEmptyText}>
                  Tap di peta untuk memilih lokasi
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* VIEW ON MAP MODAL */}
      <Modal
        visible={showViewMapModal}
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.mapPickerContainer}>
          <View style={styles.mapPickerHeader}>
            <TouchableOpacity
              style={styles.mapPickerCloseBtn}
              onPress={() => setShowViewMapModal(false)}
            >
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.mapPickerTitle}>Lokasi Tersimpan</Text>
            <View style={{ width: 36 }} />
          </View>

          {viewMapLocation && (
            <MapView
              style={styles.mapPickerMap}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: viewMapLocation.latitude,
                longitude: viewMapLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation
              zoomEnabled
              scrollEnabled
              zoomControlEnabled
            >
              <Marker coordinate={viewMapLocation}>
                <View style={styles.pinMarker}>
                  <Ionicons name="location" size={40} color="#ef4444" />
                </View>
              </Marker>
            </MapView>
          )}

          <View style={styles.mapPickerBottom}>
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
                style={styles.mapPickerConfirmGradient}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.mapPickerConfirmText}>
                  Buka di Google Maps
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  // Add Button
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#3b5fca",
    borderStyle: "dashed",
    backgroundColor: "#fff",
  },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#3b5fca" },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#64748b", fontSize: 14 },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  emptyDesc: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  // Location Card
  locationCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  locationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  locationCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  locationCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
  },
  primaryBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  primaryBadgeText: { fontSize: 11, fontWeight: "700", color: "#3b5fca" },
  locationAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationAddress: { fontSize: 12, color: "#94a3b8", flex: 1 },

  // Stats
  locationStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  locationStat: {},
  locationStatNumber: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  locationStatLabel: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  dangerLevel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dangerLevelText: { fontSize: 13, fontWeight: "700" },

  // Notification
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  notifLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  notifSub: { fontSize: 11, color: "#94a3b8", marginTop: 1 },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: "#3b5fca" },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
  },
  infoCardText: { flex: 1 },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  infoCardDesc: { fontSize: 12, color: "#64748b", lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

  // Location Buttons Row
  locationBtnsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  detectLocationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  detectLocationText: { fontSize: 12, fontWeight: "600", color: "#3b5fca" },
  mapPickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f5f3ff",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  mapPickerText: { fontSize: 12, fontWeight: "600", color: "#8b5cf6" },

  // Pinned Preview
  pinnedPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  pinnedPreviewText: {
    fontSize: 12,
    color: "#22c55e",
    fontWeight: "600",
    flex: 1,
  },

  // Or Row
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  orText: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },

  // Form
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
  },
  inputHint: { fontSize: 11, color: "#94a3b8", marginBottom: 8 },
  required: { color: "#ef4444" },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },

  // Submit
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Map Picker Modal
  mapPickerContainer: { flex: 1, backgroundColor: "#fff" },
  mapPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  mapPickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPickerTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  mapPickerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mapPickerHintText: { fontSize: 12, color: "#3b5fca", fontWeight: "600" },
  mapPickerMap: { flex: 1 },
  pinMarker: { alignItems: "center", justifyContent: "center" },

  // Map Picker Bottom
  mapPickerBottom: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  mapPickerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  mapPickerLoadingText: { fontSize: 14, color: "#64748b" },
  mapPickerAddressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
  },
  mapPickerAddress: { fontSize: 13, color: "#0f172a", flex: 1, lineHeight: 18 },
  mapPickerConfirmBtn: { borderRadius: 14, overflow: "hidden" },
  mapPickerConfirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  mapPickerConfirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  mapPickerEmpty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  mapPickerEmptyText: { fontSize: 13, color: "#94a3b8" },
});
