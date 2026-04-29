import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
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
import { useMutation, useQuery } from "@apollo/client/react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
// Progress bar width = screen - floating card margins (12 each side) - card padding cancels with negative margin
const WEATHER_BAR_WIDTH = width - 24;

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
      userId
      userName
      volunteerIds
      photos
      location {
        type
        coordinates
      }
    }
  }
`;

const GET_ME = gql`
  query GetMe {
    me {
      _id
      name
    }
  }
`;

const GET_MY_ACTIVITY_LOGS = gql`
  query GetMyActivityLogs {
    getMyActivityLogs(page: 1, limit: 100) {
      data {
        requestId
        status
      }
    }
  }
`;

const VOLUNTEER_FOR_REQUEST = gql`
  mutation VolunteerForRequest($requestId: String!) {
    volunteerForRequest(requestId: $requestId) {
      _id
      status
      volunteerIds
    }
  }
`;

const UPDATE_ACTIVITY_STATUS = gql`
  mutation UpdateActivityStatus($requestId: String!, $status: ActivityLogStatus!) {
    updateActivityStatus(requestId: $requestId, status: $status) {
      _id
      status
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
      notifyOnDangerZones
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

const GET_WEATHER_LOGS = gql`
  query GetWeatherLogs {
    getWeatherLogs {
      _id
      province
      city
      condition
      windKph
      precipMm
      humidity
      visibilityKm
      isDangerous
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

function RequestMarker({ request, onPress }) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(t);
  }, []);
  const catConfig = CATEGORY_CONFIG[request.category] || {
    color: "#6b7280",
    icon: "help-circle",
  };
  const [longitude, latitude] = request.location.coordinates;
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={[styles.marker, { backgroundColor: catConfig.color }]}>
        <Ionicons name={catConfig.icon} size={13} color="#fff" />
      </View>
    </Marker>
  );
}

function getWeatherEmoji(condition) {
  const c = (condition || "").toLowerCase();
  if (c.includes("thunder") || c.includes("storm")) return "⛈️";
  if (c.includes("heavy rain") || c.includes("heavy shower")) return "🌧️";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower"))
    return "🌦️";
  if (c.includes("snow") || c.includes("blizzard") || c.includes("sleet"))
    return "❄️";
  if (c.includes("fog") || c.includes("mist") || c.includes("haze"))
    return "🌫️";
  if (c.includes("overcast")) return "☁️";
  if (c.includes("cloud") || c.includes("partly")) return "⛅";
  if (c.includes("sunny") || c.includes("clear")) return "☀️";
  return "🌤️";
}

const DANGER_LEVEL_CONFIG = {
  extreme: {
    color: "#7f1d1d",
    fill: "rgba(127,29,29,0.15)",
    stroke: "rgba(127,29,29,0.8)",
    pinColor: "#7f1d1d",
  },
  severe: {
    color: "#ef4444",
    fill: "rgba(239,68,68,0.12)",
    stroke: "rgba(239,68,68,0.7)",
    pinColor: "#ef4444",
  },
  moderate: {
    color: "#f97316",
    fill: "rgba(249,115,22,0.10)",
    stroke: "rgba(249,115,22,0.6)",
    pinColor: "#f97316",
  },
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
  const bottomSafe = Math.max(insets.bottom, 36);
  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [volunteeredIds, setVolunteeredIds] = useState(new Set());
  const [completedIds, setCompletedIds] = useState(new Set());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAllZones, setShowAllZones] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: -6.2088,
    longitude: 106.8456,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [weatherIndex, setWeatherIndex] = useState(0);
  const weatherFadeAnim = useRef(new Animated.Value(1)).current;
  const weatherProgressAnim = useRef(new Animated.Value(0)).current;

  const { data: requestsData, refetch } = useQuery(GET_NEARBY_REQUESTS, {
    variables: userLocation
      ? {
          filter: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        }
      : {},
    skip: !userLocation,
    fetchPolicy: "network-only",
    pollInterval: 30000,
  });
  const { data: meData } = useQuery(GET_ME);
  const currentUser = meData?.me;
  const { data: activityData, refetch: refetchActivities } = useQuery(
    GET_MY_ACTIVITY_LOGS,
    { fetchPolicy: "network-only" },
  );
  const [volunteerForRequest, { loading: volunteerLoading }] = useMutation(
    VOLUNTEER_FOR_REQUEST,
    {
      onCompleted: (result) => {
        const updated = result?.volunteerForRequest;
        if (!updated) return;
        refetch();
        refetchActivities();
        setVolunteeredIds((prev) => new Set([...prev, updated._id]));
        setSelectedRequest((prev) =>
          prev?._id === updated._id
            ? {
                ...prev,
                status: updated.status,
                volunteerIds: updated.volunteerIds,
              }
            : prev,
        );
      },
    },
  );
  const [updateActivityStatus, { loading: activityLoading }] = useMutation(
    UPDATE_ACTIVITY_STATUS,
  );

  const confirm = (title, message, onConfirm) =>
    setConfirmModal({ visible: true, title, message, onConfirm });
  const { data: bmkgData } = useQuery(GET_BMKG_ALERTS, {
    pollInterval: 300000,
  });
  const { data: earthquakeData } = useQuery(GET_EARTHQUAKE_ALERTS, {
    pollInterval: 300000,
  });
  const { data: dangerZonesAllData } = useQuery(GET_ACTIVE_DANGER_ZONES, {
    fetchPolicy: "cache-and-network",
    pollInterval: 300000,
  });
  const { data: dangerZonesNearData } = useQuery(GET_DANGER_ZONES_NEAR, {
    variables: userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : {},
    skip: !userLocation || showAllZones,
    fetchPolicy: "network-only",
    pollInterval: 300000,
  });
  const { data: weatherLogsData } = useQuery(GET_WEATHER_LOGS, {
    fetchPolicy: "cache-and-network",
    pollInterval: 300000,
  });
  const { data: myLocationsData, refetch: refetchMyLocations } = useQuery(
    GET_MY_LOCATIONS,
    { fetchPolicy: "cache-and-network", pollInterval: 300000 },
  );
  const savedLocations = myLocationsData?.getMyLocations || [];
  const savedCoordinates = savedLocations
    .filter(
      (l) =>
        l.location?.coordinates?.length === 2 &&
        l.notifyOnDangerZones !== false,
    )
    .map((l) => ({
      latitude: l.location.coordinates[1],
      longitude: l.location.coordinates[0],
    }));
  const { data: dangerZonesSavedData } = useQuery(
    GET_DANGER_ZONES_FOR_LOCATIONS,
    {
      variables: { locations: savedCoordinates },
      skip: showAllZones || savedCoordinates.length === 0,
      fetchPolicy: "network-only",
      pollInterval: 300000,
    },
  );

  // Refresh location + saved-location toggles every time this screen gains focus
  useFocusEffect(
    useCallback(() => {
      refetchMyLocations();
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
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (response.notification.request.content.data?.screen === "Home") {
          navigation.navigate("Home");
        }
      },
    );
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

  const weatherLogs = weatherLogsData?.getWeatherLogs || [];
  const currentWeather = weatherLogs[weatherIndex] ?? null;

  // Auto-advance carousel every 5 s with smooth fade transition
  // Single effect owns both carousel advance and progress bar so they never desync
  useEffect(() => {
    if (weatherLogs.length <= 1) return;

    let progressAnim = null;

    const startProgress = () => {
      if (progressAnim) progressAnim.stop();
      weatherProgressAnim.setValue(0);
      progressAnim = Animated.timing(weatherProgressAnim, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      progressAnim.start();
    };

    startProgress();

    const timer = setInterval(() => {
      Animated.timing(weatherFadeAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setWeatherIndex((i) => (i + 1) % weatherLogs.length);
        startProgress();
        Animated.timing(weatherFadeAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => {
      clearInterval(timer);
      if (progressAnim) progressAnim.stop();
    };
  }, [weatherLogs.length]);

  const requests = requestsData?.getRequests || [];
  const completedActivityIds = new Set([
    ...completedIds,
    ...((activityData?.getMyActivityLogs?.data || [])
      .filter((activity) => activity.status?.toLowerCase() === "completed")
      .map((activity) => activity.requestId)),
  ]);

  const handleCompleteVolunteer = () => {
    const rid = selectedRequest?._id;
    if (!rid) return;
    setCompletedIds((prev) => new Set([...prev, rid]));
    updateActivityStatus({
      variables: { requestId: rid, status: "COMPLETED" },
      onCompleted: () => {
        refetchActivities();
      },
      onError: (error) => {
        if (error.message?.includes("completed activity")) return;
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(rid);
          return next;
        });
      },
    });
  };

  const handleCancelVolunteer = () => {
    const rid = selectedRequest?._id;
    if (!rid) return;
    updateActivityStatus({
      variables: { requestId: rid, status: "CANCELLED" },
      onCompleted: () => {
        refetch();
        refetchActivities();
        setVolunteeredIds((prev) => {
          const next = new Set(prev);
          next.delete(rid);
          return next;
        });
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(rid);
          return next;
        });
        setSelectedRequest((prev) => {
          if (!prev) return prev;
          const volunteerIds = (prev.volunteerIds || []).filter(
            (id) => id !== currentUser?._id,
          );
          return {
            ...prev,
            volunteerIds,
            status: volunteerIds.length > 0 ? "in_progress" : "pending",
          };
        });
      },
    });
  };
  const bmkgAlerts = bmkgData?.getActiveBmkgAlerts || [];
  const earthquakes = earthquakeData?.getEarthquakeAlerts || [];
  const dangerZonesRaw = showAllZones
    ? dangerZonesAllData?.getActiveDangerZones || []
    : dangerZonesNearData?.getDangerZonesNear || [];
  const dangerZonesSaved = showAllZones
    ? []
    : dangerZonesSavedData?.getDangerZonesForLocations || [];

  // Merge current-location zones + saved-location zones (deduplicate by _id)
  const mergedZones = [...dangerZonesRaw];
  const seenIds = new Set(dangerZonesRaw.map((z) => z._id));
  for (const z of dangerZonesSaved) {
    if (!seenIds.has(z._id)) mergedZones.push(z);
  }

  // Display filter: show zone if user's current location OR any saved location is inside it
  const allWatchCoords = [
    ...(userLocation
      ? [{ latitude: userLocation.latitude, longitude: userLocation.longitude }]
      : []),
    ...savedCoordinates,
  ];
  const dangerZones =
    !showAllZones && allWatchCoords.length > 0
      ? mergedZones.filter((z) => {
          if (!z.location?.coordinates) return false;
          const [zLon, zLat] = z.location.coordinates;
          return allWatchCoords.some(
            (loc) =>
              haversineKm(loc.latitude, loc.longitude, zLat, zLon) <=
              z.radiusKm,
          );
        })
      : mergedZones;

  const dangerousAlerts = bmkgAlerts.filter((a) => a.isDangerous);
  const latestEarthquake = earthquakes[0];
  const highDangerZones = dangerZones.filter(
    (z) => z.level === "severe" || z.level === "extreme",
  );
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

  const savedZoneIds = useMemo(
    () => new Set(dangerZonesSaved.map((z) => z._id)),
    [dangerZonesSaved],
  );

  // Only render zones whose center falls within the visible map region (+ 20% buffer)
  const visibleDangerZones = useMemo(() => {
    const latBuffer = mapRegion.latitudeDelta * 0.2;
    const lonBuffer = mapRegion.longitudeDelta * 0.2;
    const minLat = mapRegion.latitude - mapRegion.latitudeDelta / 2 - latBuffer;
    const maxLat = mapRegion.latitude + mapRegion.latitudeDelta / 2 + latBuffer;
    const minLon = mapRegion.longitude - mapRegion.longitudeDelta / 2 - lonBuffer;
    const maxLon = mapRegion.longitude + mapRegion.longitudeDelta / 2 + lonBuffer;
    return dangerZones.filter((z) => {
      if (!z.location?.coordinates) return false;
      const [zLon, zLat] = z.location.coordinates;
      return zLat >= minLat && zLat <= maxLat && zLon >= minLon && zLon <= maxLon;
    });
  }, [dangerZones, mapRegion]);

  const renderDangerZones = () =>
    visibleDangerZones.map((zone) => {
      if (!zone.location?.coordinates) return null;
      const [longitude, latitude] = zone.location.coordinates;
      const cfg = DANGER_LEVEL_CONFIG[zone.level] || DANGER_LEVEL_CONFIG.moderate;
      const isFromSaved = savedZoneIds.has(zone._id);
      // find which saved location name this zone covers (for the callout)
      const savedMatch = isFromSaved
        ? savedLocations.find((loc) => {
            if (!loc.location?.coordinates) return false;
            const [lLon, lLat] = loc.location.coordinates;
            return (
              haversineKm(lLat, lLon, latitude, longitude) <= zone.radiusKm
            );
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
      return (
        <RequestMarker
          key={request._id}
          request={request}
          onPress={() => setSelectedRequest(request)}
        />
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
        onRegionChangeComplete={setMapRegion}
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

        </View>
      </SafeAreaView>

      {/* ── WEATHER CAROUSEL (floating, below header) ── */}
      <View style={[styles.weatherFloating, { top: insets.top + 68 }]}>
        {!currentWeather ? (
          <View style={styles.weatherNoDataCard}>
            <Ionicons name="cloud-offline-outline" size={14} color="#64748b" />
            <Text style={styles.weatherNoDataText}>Belum ada data cuaca</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: weatherFadeAnim, borderRadius: 18, overflow: "hidden" }}>
            <LinearGradient
              colors={
                currentWeather.isDangerous
                  ? ["#7f1d1d", "#dc2626"]
                  : ["#1e3a8a", "#3b5fca"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.weatherCarouselCard}
            >
              {/* Row: emoji + info */}
              <View style={styles.weatherCarouselRow}>
                <Text style={styles.weatherCardEmoji}>
                  {getWeatherEmoji(currentWeather.condition)}
                </Text>
                <View style={styles.weatherCarouselContent}>
                  <Text style={styles.weatherCardCity}>
                    {currentWeather.province
                      ? `${currentWeather.province} - ${currentWeather.city}`
                      : currentWeather.city}
                  </Text>
                  <Text style={styles.weatherCardLabel}>{currentWeather.condition}</Text>
                  <View style={styles.weatherCardStatsRow}>
                    <Text style={styles.weatherCardStat}>💨 {Math.round(currentWeather.windKph)} km/h</Text>
                    <Text style={styles.weatherCardStat}>🌧️ {currentWeather.precipMm} mm</Text>
                    <Text style={styles.weatherCardStat}>💧 {currentWeather.humidity}%</Text>
                    <Text style={styles.weatherCardStat}>👁️ {currentWeather.visibilityKm} km</Text>
                  </View>
                </View>
              </View>
              {/* Progress bar — scaleX on native thread, left-anchored via translateX */}
              <View style={styles.weatherProgressTrack}>
                <Animated.View
                  style={[
                    styles.weatherProgressBar,
                    {
                      transform: [
                        {
                          translateX: weatherProgressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-WEATHER_BAR_WIDTH / 2, 0],
                          }),
                        },
                        { scaleX: weatherProgressAnim },
                      ],
                    },
                  ]}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </View>

      {/* ── MAP CONTROLS (kanan bawah) ── */}
      <View style={[styles.mapControls, { bottom: 90 + bottomSafe }]}>
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
          style={[
            styles.mapControlBtn,
            showAllZones && styles.mapControlBtnActive,
          ]}
          onPress={() => setShowAllZones((v) => !v)}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={showAllZones ? "#fff" : "#3b5fca"}
          />
        </TouchableOpacity>
      </View>

      {/* ── LEGEND TOGGLE (kiri bawah) ── */}
      <View style={[styles.legendControls, { bottom: bottomSafe }]}>
        <TouchableOpacity
          style={[
            styles.mapControlBtn,
            showLegend && styles.mapControlBtnActive,
          ]}
          onPress={() => setShowLegend((v) => !v)}
        >
          <Ionicons
            name="layers-outline"
            size={18}
            color={showLegend ? "#fff" : "#3b5fca"}
          />
        </TouchableOpacity>
      </View>

      {/* ── LEGEND PANEL ── */}
      {showLegend && (
        <View style={[styles.legendPanel, { bottom: 52 + bottomSafe }]}>
          <Text style={styles.legendPanelTitle}>Danger Zone</Text>
          {[
            { level: "extreme", label: "Ekstreme" },
            { level: "severe", label: "Severe" },
            { level: "moderate", label: "Moderate" },
          ].map(({ level, label }) => (
            <View key={level} style={styles.legendRow}>
              <View
                style={[
                  styles.legendColorDot,
                  { backgroundColor: DANGER_LEVEL_CONFIG[level].color },
                ]}
              />
              <Text style={styles.legendRowText}>{label}</Text>
            </View>
          ))}
          <View style={styles.legendDivider} />
          <Text style={styles.legendPanelSubTitle}>
            {showAllZones ? "All active zones" : "Zones near you"}
          </Text>
        </View>
      )}


      {/* ── SELECTED REQUEST CARD ── */}
      {selectedRequest && (
        <Animated.View
          style={[
            styles.requestCard,
            {
              transform: [{ translateY: slideAnim }],
              bottom: 75 + bottomSafe,
            },
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
          {selectedRequest.photos?.[0] && (
            <Image
              source={{ uri: selectedRequest.photos[0] }}
              style={styles.requestCardPhoto}
            />
          )}
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
          {(() => {
            const isOwn = selectedRequest.userId === currentUser?._id;
            const isVolunteered =
              volunteeredIds.has(selectedRequest._id) ||
              (currentUser?._id &&
                selectedRequest.volunteerIds?.includes(currentUser._id));
            const isCompletedByMe = completedActivityIds.has(selectedRequest._id);
            const busy = volunteerLoading || activityLoading;

            if (selectedRequest.status === "completed") {
              return (
                <View style={styles.requestDoneBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text style={styles.requestDoneText}>Request sudah selesai</Text>
                </View>
              );
            }

            if (isOwn) {
              return (
                <View style={styles.requestDoneBadge}>
                  <Ionicons name="person-circle-outline" size={18} color="#3b5fca" />
                  <Text style={[styles.requestDoneText, { color: "#3b5fca" }]}>
                    Ini request kamu
                  </Text>
                </View>
              );
            }

            if (isCompletedByMe) {
              return (
                <View style={styles.requestDoneBadge}>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text style={styles.requestDoneText}>
                    Terima kasih telah membantu
                  </Text>
                </View>
              );
            }

            if (!isVolunteered) {
              return (
                <LinearGradient
                  colors={["#3b5fca", "#5b7ee5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.volunteerBtn}
                >
                  <TouchableOpacity
                    style={styles.volunteerBtnInner}
                    onPress={() =>
                      confirm(
                        "Konfirmasi",
                        "Apakah kamu yakin ingin membantu request ini?",
                        () =>
                          volunteerForRequest({
                            variables: { requestId: selectedRequest._id },
                          }),
                      )
                    }
                    disabled={busy}
                  >
                    {volunteerLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="hand-left" size={18} color="#fff" />
                        <Text style={styles.volunteerBtnText}>Saya Mau Bantu!</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              );
            }

            return (
              <View style={styles.mapActionRow}>
                <TouchableOpacity
                  style={styles.mapCompleteBtn}
                  onPress={() =>
                    confirm(
                      "Selesai Membantu",
                      "Tandai partisipasimu sebagai selesai?",
                      handleCompleteVolunteer,
                    )
                  }
                  disabled={busy}
                >
                  {activityLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.mapCompleteBtnText}>Selesai</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mapCancelBtn}
                  onPress={() =>
                    confirm(
                      "Batalkan Partisipasi",
                      "Apakah kamu yakin ingin membatalkan partisipasimu?",
                      handleCancelVolunteer,
                    )
                  }
                  disabled={busy}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                  <Text style={styles.mapCancelBtnText}>Batalkan</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
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
              return (
                <RequestMarker
                  key={request._id}
                  request={request}
                  onPress={() => setSelectedRequest(request)}
                />
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

      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <Pressable
          style={styles.confirmOverlay}
          onPress={() => setConfirmModal({ ...confirmModal, visible: false })}
        >
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <Text style={styles.confirmTitle}>{confirmModal.title}</Text>
            <Text style={styles.confirmMessage}>{confirmModal.message}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                onPress={() => setConfirmModal({ ...confirmModal, visible: false })}
              >
                <Text style={styles.confirmBtnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtnOk}
                onPress={() => {
                  setConfirmModal({ ...confirmModal, visible: false });
                  confirmModal.onConfirm?.();
                }}
              >
                <Text style={styles.confirmBtnOkText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
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
  requestCardPhoto: {
    width: "100%",
    height: 140,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#f1f5f9",
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
  mapActionRow: { flexDirection: "row", gap: 10 },
  mapCompleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 14,
  },
  mapCompleteBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  mapCancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  mapCancelBtnText: { color: "#ef4444", fontWeight: "800", fontSize: 14 },
  requestDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  requestDoneText: { color: "#22c55e", fontWeight: "800", fontSize: 14 },

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

  // Weather carousel (floating)
  weatherFloating: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9,
    borderRadius: 18,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  weatherNoDataCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weatherNoDataText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  weatherCarouselCard: {
    borderRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 0,
    flexDirection: "column",
    overflow: "hidden",
  },
  weatherCarouselRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
  },
  weatherCarouselContent: {
    flex: 1,
  },
  weatherProgressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
    marginHorizontal: -14,
    marginTop: 10,
  },
  weatherProgressBar: {
    height: 3,
    width: WEATHER_BAR_WIDTH,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  weatherCardEmoji: {
    fontSize: 32,
  },
  weatherCardCity: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  weatherCardLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 5,
  },
  weatherCardStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weatherCardStat: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    zIndex: 50,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: { flexDirection: "row", gap: 10, width: "100%" },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  confirmBtnCancelText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  confirmBtnOk: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#3b5fca",
    alignItems: "center",
  },
  confirmBtnOkText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
