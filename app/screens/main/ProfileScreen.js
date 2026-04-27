import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';

const GET_ME = gql`
  query GetMe {
    getMe {
      _id
      name
      email
      phone
      role
      avatarUrl
    }
  }
`;

const GET_MY_REQUESTS = gql`
  query GetMyRequests {
    getMyRequests {
      _id
      status
    }
  }
`;

const GET_MY_ACTIVITIES = gql`
  query GetMyActivities {
    getMyActivities {
      _id
      status
    }
  }
`;

export default function ProfileScreen({ navigation }) {
  const { data: meData, loading: meLoading } = useQuery(GET_ME);
  const { data: requestsData } = useQuery(GET_MY_REQUESTS);
  const { data: activitiesData } = useQuery(GET_MY_ACTIVITIES);

  const user = meData?.getMe;
  const myRequests = requestsData?.getMyRequests || [];
  const myActivities = activitiesData?.getMyActivities || [];
  const helpedCount = myActivities.filter(a => a.status === 'completed').length;
  const pendingRequests = myRequests.filter(r => r.status === 'pending').length;

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Apakah kamu yakin ingin logout?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('access_token');
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (meLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5fca" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <LinearGradient
          colors={['#3b5fca', '#5b7ee5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>

          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          {user?.phone && (
            <Text style={styles.userPhone}>📞 {user?.phone}</Text>
          )}

          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#fbbf24" />
            <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'USER'}</Text>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{myRequests.length}</Text>
              <Text style={styles.statLabel}>Requests{'\n'}Created</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{helpedCount}</Text>
              <Text style={styles.statLabel}>Helped{'\n'}Others</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending{'\n'}Requests</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ACTIVITY SECTION */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ACTIVITY</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => navigation.navigate('Activity')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="time-outline" size={18} color="#3b5fca" />
                </View>
                <Text style={styles.menuItemLabel}>My Requests</Text>
              </View>
              <View style={styles.menuItemRight}>
                {pendingRequests > 0 && (
                  <View style={styles.menuCountBadge}>
                    <Text style={styles.menuCountText}>{pendingRequests}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Activity')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
                </View>
                <Text style={styles.menuItemLabel}>Volunteer History</Text>
              </View>
              <View style={styles.menuItemRight}>
                {helpedCount > 0 && (
                  <View style={[styles.menuCountBadge, { backgroundColor: '#22c55e' }]}>
                    <Text style={styles.menuCountText}>{helpedCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Create')}
            >
              <LinearGradient colors={['#ef4444', '#f97316']} style={styles.quickActionIcon}>
                <Ionicons name="alert-circle" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Request Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Locations')}
            >
              <LinearGradient colors={['#8b5cf6', '#a78bfa']} style={styles.quickActionIcon}>
                <Ionicons name="location" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Locations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('MapTab')}
            >
              <LinearGradient colors={['#22c55e', '#4ade80']} style={styles.quickActionIcon}>
                <Ionicons name="map" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>View Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NOTIFICATIONS SECTION */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>SETTINGS</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#fff7ed' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#f97316" />
                </View>
                <Text style={styles.menuItemLabel}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* VERSION */}
        <Text style={styles.version}>ResQ v1.0.0 • Made with ❤️ for Indonesia</Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  userPhone: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleText: { fontSize: 11, fontWeight: '800', color: '#fbbf24', letterSpacing: 1 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 2, lineHeight: 16 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 8 },

  // Menu
  menuSection: { paddingHorizontal: 16, paddingTop: 20 },
  menuSectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: { fontSize: 15, color: '#0f172a', fontWeight: '500' },
  menuCountBadge: {
    backgroundColor: '#3b5fca',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  menuCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textAlign: 'center' },

  // Logout
  logoutSection: { paddingHorizontal: 16, paddingTop: 20 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },

  // Version
  version: { fontSize: 12, color: '#cbd5e1', textAlign: 'center', marginTop: 16 },
});