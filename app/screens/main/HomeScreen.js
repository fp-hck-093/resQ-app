import React, { useCallback, useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const GET_ALL_REQUESTS = gql`
  query GetAllRequests {
    getAllRequests {
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
  Rescue: { color: '#ef4444', icon: 'warning', bg: '#fef2f2' },
  Shelter: { color: '#8b5cf6', icon: 'home', bg: '#f5f3ff' },
  Food: { color: '#f97316', icon: 'fast-food', bg: '#fff7ed' },
  Medical: { color: '#3b82f6', icon: 'medkit', bg: '#eff6ff' },
  'Money/Item': { color: '#22c55e', icon: 'cash', bg: '#f0fdf4' },
};

const STATUS_CONFIG = {
  pending: { color: '#ef4444', label: 'Pending' },
  in_progress: { color: '#f97316', label: 'In Progress' },
  completed: { color: '#22c55e', label: 'Selesai' },
};

export default function HomeScreen({ navigation }) {
  const mapRef = useRef(null);
  const fullMapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [filterRadius, setFilterRadius] = useState('5km');
  const [showDangerZones, setShowDangerZones] = useState(false);

  const { data: requestsData, loading: requestsLoading, refetch } = useQuery(GET_ALL_REQUESTS, { pollInterval: 30000 });
  const { data: bmkgData } = useQuery(GET_BMKG_ALERTS, { pollInterval: 300000 });
  const { data: earthquakeData } = useQuery(GET_EARTHQUAKE_ALERTS, { pollInterval: 300000 });

  // Pulse animation for markers
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Get user location every time screen is focused (including after login)
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const position = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
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

  const handleLocate = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 800);
    } catch (e) {
      console.log('Location error:', e);
    }
  };

  const requests = requestsData?.getAllRequests || [];
  const bmkgAlerts = bmkgData?.getActiveBmkgAlerts || [];
  const earthquakes = earthquakeData?.getEarthquakeAlerts || [];
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const dangerousAlerts = bmkgAlerts.filter(a => a.isDangerous);
  const latestEarthquake = earthquakes[0];
  const allAlerts = [
    ...dangerousAlerts.map(a => ({ id: a._id, icon: 'warning', color: '#ef4444', text: `${a.event} — ${a.areaDesc}` })),
    ...(latestEarthquake ? [{ id: latestEarthquake._id, icon: 'earth', color: '#8b5cf6', text: `M${latestEarthquake.magnitude} Gempa — ${latestEarthquake.wilayah}` }] : []),
  ];

  const renderMarkers = () => requests.map((request) => {
    if (!request.location?.coordinates) return null;
    const [longitude, latitude] = request.location.coordinates;
    const catConfig = CATEGORY_CONFIG[request.category] || { color: '#6b7280', icon: 'help-circle' };
    return (
      <Marker
        key={request._id}
        coordinate={{ latitude, longitude }}
        onPress={() => setSelectedRequest(request)}
      >
        <View style={styles.markerContainer}>
          <Animated.View style={[
            styles.markerPulse,
            { backgroundColor: catConfig.color + '30', transform: [{ scale: pulseAnim }] }
          ]} />
          <View style={[styles.marker, { backgroundColor: catConfig.color }]}>
            <Ionicons name={catConfig.icon} size={13} color="#fff" />
          </View>
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
        showsUserLocation
        showsMyLocationButton={false}
        zoomEnabled
        scrollEnabled
        zoomControlEnabled
      >
        {renderMarkers()}

        {userLocation && (
          <Circle
            center={userLocation}
            radius={3000}
            fillColor="rgba(59, 95, 202, 0.06)"
            strokeColor="rgba(59, 95, 202, 0.2)"
            strokeWidth={1}
          />
        )}
      </MapView>

      {/* ── HEADER ── */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/ResQ2.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>ResQ</Text>
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.activeChip}>
              <Ionicons name="flash" size={12} color="#3b5fca" />
              <Text style={styles.activeChipText}>{pendingCount} Active</Text>
            </View>
            <View style={styles.locationChip}>
              <Ionicons name="location" size={12} color="#22c55e" />
              <Text style={styles.locationChipText}>Jakarta</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications" size={20} color="#0f172a" />
              {dangerousAlerts.length > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{dangerousAlerts.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* FILTER BAR */}
        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options-outline" size={14} color="#0f172a" />
            <Text style={styles.filterBtnText}>Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterRadius === '5km' && styles.filterChipActive]}
            onPress={() => setFilterRadius('5km')}
          >
            <Ionicons name="people-outline" size={13} color={filterRadius === '5km' ? '#fff' : '#0f172a'} />
            <Text style={[styles.filterChipText, filterRadius === '5km' && styles.filterChipTextActive]}>5km</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, showDangerZones && styles.filterChipDanger]}
            onPress={() => setShowDangerZones(!showDangerZones)}
          >
            <Ionicons name="layers-outline" size={13} color={showDangerZones ? '#fff' : '#0f172a'} />
            <Text style={[styles.filterChipText, showDangerZones && styles.filterChipTextActive]}>Danger Zones</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── LIVE UPDATES CARD (kanan atas) ── */}
      <View style={styles.liveUpdatesCard}>
        <LinearGradient colors={['#1e3a8a', '#3b5fca']} style={styles.liveUpdatesGradient}>
          <View style={styles.liveUpdatesHeader}>
            <Ionicons name="flash" size={12} color="#fbbf24" />
            <Text style={styles.liveUpdatesTitle}>Live Updates</Text>
          </View>
          {requestsLoading ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 8 }} />
          ) : (
            <>
              <Text style={styles.liveUpdatesCount}>{pendingCount}</Text>
              <Text style={styles.liveUpdatesLabel}>Active Requests</Text>
              <View style={styles.liveUpdatesLocation}>
                <Ionicons name="location" size={10} color="#93c5fd" />
                <Text style={styles.liveUpdatesLocationText}>Jakarta Area</Text>
              </View>
            </>
          )}
        </LinearGradient>
      </View>

      {/* ── MAP CONTROLS (kanan bawah) ── */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapControlBtn} onPress={handleLocate}>
          <Ionicons name="locate" size={18} color="#3b5fca" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapControlBtn} onPress={() => refetch()}>
          <Ionicons name="refresh" size={18} color="#3b5fca" />
        </TouchableOpacity>
      </View>



      {/* ── SELECTED REQUEST CARD ── */}
      {selectedRequest && (
        <Animated.View style={[styles.requestCard, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.requestCardHandle} />
          <View style={styles.requestCardHeader}>
            <View style={[
              styles.requestCategoryBadge,
              { backgroundColor: (CATEGORY_CONFIG[selectedRequest.category]?.color || '#6b7280') + '15' }
            ]}>
              <Ionicons
                name={CATEGORY_CONFIG[selectedRequest.category]?.icon || 'help-circle'}
                size={16}
                color={CATEGORY_CONFIG[selectedRequest.category]?.color || '#6b7280'}
              />
              <Text style={[
                styles.requestCategoryText,
                { color: CATEGORY_CONFIG[selectedRequest.category]?.color || '#6b7280' }
              ]}>
                {selectedRequest.category}
              </Text>
            </View>
            <View style={[
              styles.statusPill,
              { backgroundColor: (STATUS_CONFIG[selectedRequest.status]?.color || '#6b7280') + '15' }
            ]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_CONFIG[selectedRequest.status]?.color }]} />
              <Text style={[styles.statusPillText, { color: STATUS_CONFIG[selectedRequest.status]?.color }]}>
                {STATUS_CONFIG[selectedRequest.status]?.label}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <Text style={styles.requestCardDesc} numberOfLines={2}>{selectedRequest.description}</Text>
          <View style={styles.requestCardMeta}>
            <View style={styles.requestMetaItem}>
              <Ionicons name="person-outline" size={12} color="#94a3b8" />
              <Text style={styles.requestMetaText}>{selectedRequest.userName}</Text>
            </View>
            <View style={styles.requestMetaItem}>
              <Ionicons name="people-outline" size={12} color="#94a3b8" />
              <Text style={styles.requestMetaText}>{selectedRequest.numberOfPeople} orang</Text>
            </View>
          </View>
          {selectedRequest.status === 'pending' && (
            <LinearGradient
              colors={['#3b5fca', '#5b7ee5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.volunteerBtn}
            >
              <TouchableOpacity
                style={styles.volunteerBtnInner}
                onPress={() => navigation.navigate('Requests')}
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
            initialRegion={userLocation ? {
              ...userLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            } : {
              latitude: -6.2088,
              longitude: 106.8456,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation
            zoomEnabled
            scrollEnabled
            zoomControlEnabled
          >
            {requests.map((request) => {
              if (!request.location?.coordinates) return null;
              const [longitude, latitude] = request.location.coordinates;
              const catConfig = CATEGORY_CONFIG[request.category] || { color: '#6b7280', icon: 'help-circle' };
              return (
                <Marker key={request._id} coordinate={{ latitude, longitude }}>
                  <View style={[styles.marker, { backgroundColor: catConfig.color }]}>
                    <Ionicons name={catConfig.icon} size={13} color="#fff" />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setIsFullScreen(false)}>
            <BlurView intensity={80} tint="light" style={styles.fullScreenCloseBtnBlur}>
              <Ionicons name="contract" size={20} color="#3b5fca" />
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity style={styles.fullScreenLocateBtn} onPress={handleLocate}>
            <BlurView intensity={80} tint="light" style={styles.fullScreenCloseBtnBlur}>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 30, height: 30 },
  logoText: { marginLeft: -4, fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerCenter: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeChipText: { fontSize: 11, fontWeight: '700', color: '#3b5fca' },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  locationChipText: { fontSize: 11, fontWeight: '700', color: '#22c55e' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  notifBtn: { position: 'relative', padding: 4 },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#3b5fca', borderColor: '#3b5fca' },
  filterChipDanger: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  filterChipTextActive: { color: '#fff' },

  // Live Updates Card
  liveUpdatesCard: {
    position: 'absolute',
    top: 160,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 5,
  },
  liveUpdatesGradient: {
    padding: 14,
    width: 130,
    alignItems: 'center',
  },
  liveUpdatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  liveUpdatesTitle: { fontSize: 10, fontWeight: '800', color: '#fbbf24', letterSpacing: 0.5 },
  liveUpdatesCount: { fontSize: 36, fontWeight: '800', color: '#fff' },
  liveUpdatesLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textAlign: 'center' },
  liveUpdatesLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveUpdatesLocationText: { fontSize: 10, color: '#93c5fd', fontWeight: '600' },

  // Map Controls
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    gap: 8,
    zIndex: 5,
  },
  mapControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },

  // Alert Bar
  alertBar: {
    position: 'absolute',
    bottom: 155,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    zIndex: 5,
  },
  alertBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  alertBarText: { fontSize: 11, fontWeight: '600', maxWidth: 180 },

  // Map Legend
  mapLegend: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 5,
    minWidth: 140,
  },
  mapLegendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mapLegendTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Marker
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerPulse: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 5,
  },

  // You Are Here
  youAreHereContainer: { alignItems: 'center' },
  youAreHereLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  youAreHereText: { fontSize: 11, fontWeight: '700', color: '#0f172a' },
  youAreHerePulseWrap: { alignItems: 'center', justifyContent: 'center' },
  youAreHerePulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 95, 202, 0.25)',
  },
  youAreHereDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3b5fca',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
  },

  // Request Card
  requestCard: {
    position: 'absolute',
    bottom: 75,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  requestCardHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  requestCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  requestCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  requestCategoryText: { fontSize: 12, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  closeBtn: { marginLeft: 'auto', padding: 4 },
  requestCardDesc: { fontSize: 14, color: '#1e293b', lineHeight: 20, marginBottom: 12 },
  requestCardMeta: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  requestMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requestMetaText: { fontSize: 12, color: '#94a3b8' },
  volunteerBtn: { borderRadius: 14, overflow: 'hidden' },
  volunteerBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  volunteerBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Fullscreen Modal
  fullScreenContainer: { flex: 1 },
  fullScreenMap: { flex: 1 },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullScreenLocateBtn: {
    position: 'absolute',
    top: 106,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fullScreenCloseBtnBlur: { padding: 12 },
});
