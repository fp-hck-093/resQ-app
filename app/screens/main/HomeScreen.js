import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from "react-native-maps";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const GET_NEARBY_REQUESTS = gql`
  query GetRequests($filter: GetRequestsFilterInput) {
    getRequests(filter: $filter) {
      _id
      category
      description
      status
      address
      numberOfPeople
      urgencyScore
      userName
      location {
        type
        coordinates
      }
    }
  }
`;

const GET_ACTIVE_DANGER_ZONES = gql`
  query GetActiveDangerZones {
    getActiveDangerZones {
      _id
      title
      description
      level
      location {
        type
        coordinates
      }
      radiusKm
      requestCount
    }
  }
`;

const GET_DANGER_ZONES_NEAR = gql`
  query GetDangerZonesNear($latitude: Float!, $longitude: Float!) {
    getDangerZonesNear(latitude: $latitude, longitude: $longitude) {
      _id
      title
      description
      level
      location {
        type
        coordinates
      }
      radiusKm
      requestCount
    }
  }
`;

const GET_MY_LOCATIONS = gql`
  query GetMyLocations {
    getMyLocations {
      _id
      address
      city
      location {
        coordinates
      }
    }
  }
`;

const GET_DANGER_ZONES_FOR_LOCATIONS = gql`
  query GetDangerZonesForLocations($locations: [CoordinateInput!]!) {
    getDangerZonesForLocations(locations: $locations) {
      _id
      title
      description
      level
      location {
        type
        coordinates
      }
      radiusKm
      requestCount
    }
  }
`;

const GET_BMKG_ALERTS = gql`
  query GetActiveBmkgAlerts {
    getActiveBmkgAlerts {
      _id
      title
      event
      severity
      areaDesc
      isDangerous
    }
  }
`;

const GET_EARTHQUAKE_ALERTS = gql`
  query GetEarthquakeAlerts {
    getEarthquakeAlerts(limit: 1) {
      _id
      tanggal
      jam
      magnitude
      kedalaman
      wilayah
    }
  }
`;

const CATEGORY_CONFIG = {
  Rescue: { color: "#ef4444", icon: "warning", bg: "#fef2f2" },
  Shelter: { color: "#8b5cf6", icon: "home", bg: "#f5f3ff" },
  Food: { color: "#f97316", icon: "fast-food", bg: "#fff7ed" },
  Medical: { color: "#3b82f6", icon: "medkit", bg: "#eff6ff" },
  "Money/Item": { color: "#22c55e", icon: "cash", bg: "#f0fdf4" },
};

const DANGER_LEVEL_CONFIG = {
  extreme:  { color: "#7f1d1d", fill: "rgba(127,29,29,0.15)",  stroke: "rgba(127,29,29,0.8)",  pinColor: "#7f1d1d" },
  high:     { color: "#ef4444", fill: "rgba(239,68,68,0.12)",  stroke: "rgba(239,68,68,0.7)",  pinColor: "#ef4444" },
  moderate: { color: "#f97316", fill: "rgba(249,115,22,0.10)", stroke: "rgba(249,115,22,0.6)", pinColor: "#f97316" },
  low:      { color: "#eab308", fill: "rgba(234,179,8,0.08)",  stroke: "rgba(234,179,8,0.5)",  pinColor: "#eab308" },
};

const STATUS_CONFIG = {
  pending: { color: "#ef4444", label: "Pending" },
  in_progress: { color: "#f97316", label: "In Progress" },
  completed: { color: "#22c55e", label: "Selesai" },
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAllZones, setShowAllZones] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const {
    data: requestsData,
    refetch,
  } = useQuery(GET_NEARBY_REQUESTS, {
    variables: userLocation
      ? { filter: { latitude: userLocation.latitude, longitude: userLocation.longitude } }
      : {},
    skip: !userLocation,
    fetchPolicy: 'network-only',
    pollInterval: 30000,
  });
  const { data: bmkgData } = useQuery(GET_BMKG_ALERTS, {
    pollInterval: 300000,
  });
  const { data: earthquakeData } = useQuery(GET_EARTHQUAKE_ALERTS, {
    pollInterval: 300000,
  });
  const { data: dangerZonesAllData } = useQuery(GET_ACTIVE_DANGER_ZONES, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 300000,
  });
  const { data: dangerZonesNearData } = useQuery(GET_DANGER_ZONES_NEAR, {
    variables: userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : {},
    skip: !userLocation || showAllZones,
    fetchPolicy: 'network-only',
    pollInterval: 300000,
  });
  const { data: myLocationsData } = useQuery(GET_MY_LOCATIONS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 300000,
  });
  const savedLocations = myLocationsData?.getMyLocations || [];
  const savedCoordinates = savedLocations
    .filter((l) => l.location?.coordinates?.length === 2)
    .map((l) => ({
      latitude: l.location.coordinates[1],
      longitude: l.location.coordinates[0],
    }));
  const { data: dangerZonesSavedData } = useQuery(GET_DANGER_ZONES_FOR_LOCATIONS, {
    variables: { locations: savedCoordinates },
    skip: showAllZones || savedCoordinates.length === 0,
    fetchPolicy: 'network-only',
    pollInterval: 300000,
  });

  // Get user location every time screen is focused (including after login)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const position = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        refetch({ filter: { latitude, longitude } });
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000,
        );
      })();
    }, []),
  );

  // Animate selected request card
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedRequest ? 0 : 300,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  }, [selectedRequest]);

  // Handle notification tap → navigate to HomeScreen
  useEffect(() => {
    // App was opened by tapping a notification (from background/closed)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification?.request?.content?.data?.screen === "Home") {
        navigation.navigate("Home");
      }
    });
    // App is foregrounded and user taps a notification
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.screen === "Home") {
        navigation.navigate("Home");
      }
    });
    return () => sub.remove();
  }, []);

  const handleLocate = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      mapRef.current?.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800,
      );
    } catch (e) {
      console.log("Location error:", e);
    }
  };

  const requests = requestsData?.getRequests || [];
  const bmkgAlerts = bmkgData?.getActiveBmkgAlerts || [];
  const earthquakes = earthquakeData?.getEarthquakeAlerts || [];
  const dangerZonesRaw = showAllZones
    ? (dangerZonesAllData?.getActiveDangerZones || [])
    : (dangerZonesNearData?.getDangerZonesNear || []);
  const dangerZonesSaved = showAllZones ? [] : (dangerZonesSavedData?.getDangerZonesForLocations || []);

  // Merge current-location zones + saved-location zones (deduplicate by _id)
  const mergedZones = [...dangerZonesRaw];
  const seenIds = new Set(dangerZonesRaw.map((z) => z._id));
  for (const z of dangerZonesSaved) {
    if (!seenIds.has(z._id)) mergedZones.push(z);
  }

  // Display filter: show zone if user's current location OR any saved location is inside it
  const allWatchCoords = [
    ...(userLocation ? [{ latitude: userLocation.latitude, longitude: userLocation.longitude }] : []),
    ...savedCoordinates,
  ];
  const dangerZones = (!showAllZones && allWatchCoords.length > 0)
    ? mergedZones.filter((z) => {
        if (!z.location?.coordinates) return false;
        const [zLon, zLat] = z.location.coordinates;
        return allWatchCoords.some(
          (loc) => haversineKm(loc.latitude, loc.longitude, zLat, zLon) <= z.radiusKm,
        );
      })
    : mergedZones;
  console.log('[DangerZones] current:', dangerZonesRaw.length, '| saved:', dangerZonesSaved.length, '| displayed:', dangerZones.length);

  const dangerousAlerts = bmkgAlerts.filter((a) => a.isDangerous);
  const latestEarthquake = earthquakes[0];
  const highDangerZones = dangerZones.filter((z) => z.level === "high" || z.level === "extreme");
  const allAlerts = [
    ...highDangerZones.map((z) => ({
      id: z._id,
      icon: "alert-circle",
      color: "#ef4444",
      text: `Zona Bahaya: ${z.title}`,
    })),
    ...dangerousAlerts.map((a) => ({
      id: a._id,
      icon: "warning",
      color: "#ef4444",
      text: `${a.event} — ${a.areaDesc}`,
    })),
    ...(latestEarthquake
      ? [
          {
            id: latestEarthquake._id,
            icon: "earth",
            color: "#8b5cf6",
            text: `M${latestEarthquake.magnitude} Gempa — ${latestEarthquake.wilayah}`,
          },
        ]
      : []),
  ];

  const savedZoneIds = new Set(dangerZonesSaved.map((z) => z._id));

  const renderDangerZones = () =>
    dangerZones.map((zone) => {
      if (!zone.location?.coordinates) return null;
      const [longitude, latitude] = zone.location.coordinates;
      const cfg = DANGER_LEVEL_CONFIG[zone.level] || DANGER_LEVEL_CONFIG.low;
      const isFromSaved = savedZoneIds.has(zone._id);
      // find which saved location name this zone covers (for the callout)
      const savedMatch = isFromSaved
        ? savedLocations.find((loc) => {
            if (!loc.location?.coordinates) return false;
            const [lLon, lLat] = loc.location.coordinates;
            return haversineKm(lLat, lLon, latitude, longitude) <= zone.radiusKm;
          })
        : null;
      return (
        <React.Fragment key={zone._id}>
          <Circle
            center={{ latitude, longitude }}
            radius={zone.radiusKm * 1000}
            fillColor={cfg.fill}
            strokeColor={isFromSaved ? cfg.color : cfg.stroke}
            strokeWidth={isFromSaved ? 2.5 : 1.5}
            strokeDashPattern={isFromSaved ? [8, 4] : undefined}
          />
          <Marker
            coordinate={{ latitude, longitude }}
            pinColor={cfg.pinColor}
            title={`${isFromSaved ? "📍 " : ""}${zone.title}`}
            description={`Level: ${zone.level} · ${zone.radiusKm} km${savedMatch ? ` · ${savedMatch.city}` : ""}`}
          />
        </React.Fragment>
      );
    });

  const renderMarkers = () =>
    requests.map((request) => {
      if (!request.location?.coordinates) return null;
      const [longitude, latitude] = request.location.coordinates;
      const catConfig = CATEGORY_CONFIG[request.category] || {
        color: "#6b7280",
        icon: "help-circle",
      };
      return (
        <Marker
          key={request._id}
          coordinate={{ latitude, longitude }}
          onPress={() => setSelectedRequest(request)}
        >
          <View style={[styles.marker, { backgroundColor: catConfig.color }]}>
            <Ionicons name={catConfig.icon} size={13} color="#fff" />
          </View>
        </Marker>
      );
    });

  return (
    <View style={styles.container}>
      {/* FULLSCREEN MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        initialRegion={{
          latitude: -6.2088,
          longitude: 106.8456,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        zoomControlEnabled
      >
        {renderDangerZones()}
        {renderMarkers()}

        {userLocation && (
          <>
            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.userPinWrapper}>
                <View style={styles.userPinHead} />
                <View style={styles.userPinTail} />
              </View>
            </Marker>
            <Circle
              center={userLocation}
              radius={5000}
              fillColor="rgba(59, 95, 202, 0.04)"
              strokeColor="rgba(59, 95, 202, 0.2)"
              strokeWidth={1}
            />
          </>
        )}
      </MapView>

      {/* ── HEADER ── */}
      <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../../assets/ResQ2.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>ResQ</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications" size={20} color="#0f172a" />
              {dangerousAlerts.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {dangerousAlerts.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>


      {/* ── MAP CONTROLS (kanan bawah) ── */}
      <View style={[styles.mapControls, { bottom: 180 + insets.bottom }]}>
        <TouchableOpacity style={styles.mapControlBtn} onPress={handleLocate}>
          <Ionicons name="locate" size={18} color="#3b5fca" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={() => refetch()}
        >
          <Ionicons name="refresh" size={18} color="#3b5fca" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapControlBtn, showAllZones && styles.mapControlBtnActive]}
          onPress={() => setShowAllZones((v) => !v)}
        >
          <Ionicons name="globe-outline" size={18} color={showAllZones ? "#fff" : "#3b5fca"} />
        </TouchableOpacity>
      </View>

      {/* ── LEGEND TOGGLE (kiri bawah) ── */}
      <View style={[styles.legendControls, { bottom: 180 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.mapControlBtn, showLegend && styles.mapControlBtnActive]}
          onPress={() => setShowLegend((v) => !v)}
        >
          <Ionicons name="layers-outline" size={18} color={showLegend ? "#fff" : "#3b5fca"} />
        </TouchableOpacity>
      </View>

      {/* ── LEGEND PANEL ── */}
      {showLegend && (
        <View style={[styles.legendPanel, { bottom: 232 + insets.bottom }]}>
          <Text style={styles.legendPanelTitle}>Zona Bahaya</Text>
          {[
            { level: "extreme", label: "Ekstrem" },
            { level: "high",    label: "Tinggi" },
            { level: "moderate",label: "Sedang" },
            { level: "low",     label: "Rendah" },
          ].map(({ level, label }) => (
            <View key={level} style={styles.legendRow}>
              <View style={[styles.legendColorDot, { backgroundColor: DANGER_LEVEL_CONFIG[level].color }]} />
              <Text style={styles.legendRowText}>{label}</Text>
            </View>
          ))}
          <View style={styles.legendDivider} />
          <Text style={styles.legendPanelSubTitle}>
            {showAllZones ? "Semua zona aktif" : "Zona di sekitar kamu"}
          </Text>
        </View>
      )}

      {/* ── SELECTED REQUEST CARD ── */}
      {selectedRequest && (
        <Animated.View
          style={[
            styles.requestCard,
            { transform: [{ translateY: slideAnim }], bottom: 75 + insets.bottom },
          ]}
        >
          <View style={styles.requestCardHandle} />
          <View style={styles.requestCardHeader}>
            <View
              style={[
                styles.requestCategoryBadge,
                {
                  backgroundColor:
                    (CATEGORY_CONFIG[selectedRequest.category]?.color ||
                      "#6b7280") + "15",
                },
              ]}
            >
              <Ionicons
                name={
                  CATEGORY_CONFIG[selectedRequest.category]?.icon ||
                  "help-circle"
                }
                size={16}
                color={
                  CATEGORY_CONFIG[selectedRequest.category]?.color || "#6b7280"
                }
              />
              <Text
                style={[
                  styles.requestCategoryText,
                  {
                    color:
                      CATEGORY_CONFIG[selectedRequest.category]?.color ||
                      "#6b7280",
                  },
                ]}
              >
                {selectedRequest.category}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    (STATUS_CONFIG[selectedRequest.status]?.color ||
                      "#6b7280") + "15",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      STATUS_CONFIG[selectedRequest.status]?.color,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: STATUS_CONFIG[selectedRequest.status]?.color },
                ]}
              >
                {STATUS_CONFIG[selectedRequest.status]?.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedRequest(null)}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.requestCardDesc} numberOfLines={2}>
            {selectedRequest.description}
          </Text>
          <View style={styles.requestCardMeta}>
            <View style={styles.requestMetaItem}>
              <Ionicons name="person-outline" size={12} color="#94a3b8" />
              <Text style={styles.requestMetaText}>
                {selectedRequest.userName}
              </Text>
            </View>
            <View style={styles.requestMetaItem}>
              <Ionicons name="people-outline" size={12} color="#94a3b8" />
              <Text style={styles.requestMetaText}>
                {selectedRequest.numberOfPeople} orang
              </Text>
            </View>
          </View>
          {selectedRequest.status === "pending" && (
            <LinearGradient
              colors={["#3b5fca", "#5b7ee5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.volunteerBtn}
            >
              <TouchableOpacity
                style={styles.volunteerBtnInner}
                onPress={() => navigation.navigate("Requests")}
              >
                <Ionicons name="hand-left" size={18} color="#fff" />
                <Text style={styles.volunteerBtnText}>Saya Mau Bantu!</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </Animated.View>
      )}

      {/* ── FULLSCREEN MAP MODAL ── */}
      <Modal visible={isFullScreen} animationType="slide" statusBarTranslucent>
        <View style={styles.fullScreenContainer}>
          <MapView
            ref={fullMapRef}
            style={styles.fullScreenMap}
            provider={PROVIDER_GOOGLE}
            mapType="standard"
            initialRegion={
              userLocation
                ? {
                    ...userLocation,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }
                : {
                    latitude: -6.2088,
                    longitude: 106.8456,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
            }
            showsUserLocation
            zoomEnabled
            scrollEnabled
            zoomControlEnabled
          >
            {renderDangerZones()}
            {requests.map((request) => {
              if (!request.location?.coordinates) return null;
              const [longitude, latitude] = request.location.coordinates;
              const catConfig = CATEGORY_CONFIG[request.category] || {
                color: "#6b7280",
                icon: "help-circle",
              };
              return (
                <Marker key={request._id} coordinate={{ latitude, longitude }}>
                  <View
                    style={[
                      styles.marker,
                      { backgroundColor: catConfig.color },
                    ]}
                  >
                    <Ionicons name={catConfig.icon} size={13} color="#fff" />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setIsFullScreen(false)}
          >
            <BlurView
              intensity={80}
              tint="light"
              style={styles.fullScreenCloseBtnBlur}
            >
              <Ionicons name="contract" size={20} color="#3b5fca" />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fullScreenLocateBtn}
            onPress={handleLocate}
          >
            <BlurView
              intensity={80}
              tint="light"
              style={styles.fullScreenCloseBtnBlur}
            >
              <Ionicons name="locate" size={20} color="#3b5fca" />
            </BlurView>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Header
  headerSafeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  logo: { width: 30, height: 30 },
  logoText: {
    marginLeft: -4,
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },

  headerRight: { flex: 1, alignItems: "flex-end" },
  notifBtn: { position: "relative", padding: 4 },
  notifBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },


  // Map Controls
  mapControls: {
    position: "absolute",
    right: 16,
    gap: 8,
    zIndex: 5,
  },
  mapControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Alert Bar
  alertBar: {
    position: "absolute",
    bottom: 155,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.97)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    zIndex: 5,
  },
  alertBarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  alertBarText: { fontSize: 11, fontWeight: "600", maxWidth: 180 },

  // Map Legend
  mapLegend: {
    position: "absolute",
    bottom: 80,
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 5,
    minWidth: 140,
  },
  mapLegendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  mapLegendTitle: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: "#64748b", fontWeight: "500" },

  // Marker
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 5,
  },

  // You Are Here
  youAreHereContainer: { alignItems: "center" },
  youAreHereLabel: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  youAreHereText: { fontSize: 11, fontWeight: "700", color: "#0f172a" },
  youAreHerePulseWrap: { alignItems: "center", justifyContent: "center" },
  youAreHerePulse: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(59, 95, 202, 0.25)",
  },
  youAreHereDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#3b5fca",
    borderWidth: 2.5,
    borderColor: "#fff",
    elevation: 4,
  },

  // Request Card
  requestCard: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  requestCardHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  requestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  requestCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  requestCategoryText: { fontSize: 12, fontWeight: "700" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  closeBtn: { marginLeft: "auto", padding: 4 },
  requestCardDesc: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 20,
    marginBottom: 12,
  },
  requestCardMeta: { flexDirection: "row", gap: 12, marginBottom: 14 },
  requestMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  requestMetaText: { fontSize: 12, color: "#94a3b8" },
  volunteerBtn: { borderRadius: 14, overflow: "hidden" },
  volunteerBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  volunteerBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // Fullscreen Modal
  fullScreenContainer: { flex: 1 },
  fullScreenMap: { flex: 1 },
  fullScreenCloseBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  fullScreenLocateBtn: {
    position: "absolute",
    top: 106,
    right: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  fullScreenCloseBtnBlur: { padding: 12 },

  // Map control active state
  mapControlBtnActive: {
    backgroundColor: "#3b5fca",
  },

  // Legend controls (left side)
  legendControls: {
    position: "absolute",
    left: 16,
    gap: 8,
    zIndex: 5,
  },

  // Legend panel
  legendPanel: {
    position: "absolute",
    left: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 5,
    minWidth: 140,
  },
  legendPanelTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendRowText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  legendDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 8,
  },
  legendPanelSubTitle: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});
