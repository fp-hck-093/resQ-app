import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const GET_MY_ACTIVITIES = gql`
  query GetMyActivities {
    getMyActivities {
      _id
      volunteerId
      requestId
      status
      createdAt
      updatedAt
    }
  }
`;

const GET_MY_REQUESTS = gql`
  query GetMyRequests {
    getMyRequests {
      _id
      category
      description
      status
      address
      numberOfPeople
      createdAt
    }
  }
`;

const UPDATE_ACTIVITY_STATUS = gql`
  mutation UpdateActivityStatus(
    $requestId: String!
    $status: ActivityLogStatus!
  ) {
    updateActivityStatus(requestId: $requestId, status: $status) {
      _id
      status
    }
  }
`;

const STATUS_CONFIG = {
  pending: {
    color: "#f97316",
    bg: "#fff7ed",
    icon: "time-outline",
    label: "Pending",
  },
  in_progress: {
    color: "#3b5fca",
    bg: "#eff6ff",
    icon: "reload-outline",
    label: "In Progress",
  },
  completed: {
    color: "#22c55e",
    bg: "#f0fdf4",
    icon: "checkmark-circle-outline",
    label: "Selesai",
  },
  active: {
    color: "#3b5fca",
    bg: "#eff6ff",
    icon: "reload-outline",
    label: "Aktif",
  },
  cancelled: {
    color: "#ef4444",
    bg: "#fef2f2",
    icon: "close-circle-outline",
    label: "Dibatalkan",
  },
};

const CATEGORY_CONFIG = {
  Rescue: { color: "#ef4444", bg: "#fef2f2", icon: "warning" },
  Shelter: { color: "#8b5cf6", bg: "#f5f3ff", icon: "home" },
  Food: { color: "#f97316", bg: "#fff7ed", icon: "fast-food" },
  Medical: { color: "#3b82f6", bg: "#eff6ff", icon: "medkit" },
  "Money/Item": { color: "#22c55e", bg: "#f0fdf4", icon: "cash" },
};

export default function ActivityScreen({ route }) {
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "volunteer");

  const {
    data: activitiesData,
    loading: activitiesLoading,
    refetch: refetchActivities,
  } = useQuery(GET_MY_ACTIVITIES);
  const {
    data: requestsData,
    loading: requestsLoading,
    refetch: refetchRequests,
  } = useQuery(GET_MY_REQUESTS);

  const [updateStatus, { loading: updateLoading }] = useMutation(
    UPDATE_ACTIVITY_STATUS,
    {
      onCompleted: () => refetchActivities(),
    },
  );

  const activities = activitiesData?.getMyActivities || [];
  const myRequests = requestsData?.getMyRequests || [];

  const completedCount = activities.filter(
    (a) => a.status === "completed",
  ).length;
  const activeCount = activities.filter((a) => a.status === "active").length;

  const renderActivity = ({ item }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.cardIconWrap, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={22} color={config.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>
              Request #{item.requestId?.slice(-6).toUpperCase()}
            </Text>
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
            <View
              style={[styles.statusDot, { backgroundColor: config.color }]}
            />
            <Text style={[styles.statusPillText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {item.status === "active" && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() =>
                updateStatus({
                  variables: { requestId: item.requestId, status: "completed" },
                })
              }
              disabled={updateLoading}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.completeBtnText}>Tandai Selesai</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() =>
                updateStatus({
                  variables: { requestId: item.requestId, status: "cancelled" },
                })
              }
              disabled={updateLoading}
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Batalkan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderRequest = ({ item }) => {
    const catConfig = CATEGORY_CONFIG[item.category] || {
      color: "#6b7280",
      bg: "#f9fafb",
      icon: "help-circle",
    };
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    return (
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View
            style={[styles.cardIconWrap, { backgroundColor: catConfig.bg }]}
          >
            <Ionicons name={catConfig.icon} size={22} color={catConfig.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.category}</Text>
            <Text style={styles.cardDesc} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
          <View
            style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusConfig.color },
              ]}
            />
            <Text
              style={[styles.statusPillText, { color: statusConfig.color }]}
            >
              {item.status?.replace("_", " ")}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.cardMetaItem}>
            <Ionicons name="people-outline" size={12} color="#94a3b8" />
            <Text style={styles.cardMetaText}>{item.numberOfPeople} orang</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <Ionicons name="location-outline" size={12} color="#94a3b8" />
            <Text style={styles.cardMetaText} numberOfLines={1}>
              {item.address || "Lokasi tidak tersedia"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const isLoading =
    activeTab === "volunteer" ? activitiesLoading : requestsLoading;
  const isEmpty =
    activeTab === "volunteer"
      ? activities.length === 0
      : myRequests.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER GRADIENT */}
      <LinearGradient
        colors={["#3b5fca", "#5b7ee5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSubtitle}>Riwayat aktivitasmu</Text>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Selesai</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeCount}</Text>
            <Text style={styles.statLabel}>Aktif</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{myRequests.length}</Text>
            <Text style={styles.statLabel}>Request</Text>
          </View>
        </View>
      </LinearGradient>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "volunteer" && styles.tabActive]}
          onPress={() => setActiveTab("volunteer")}
        >
          <Ionicons
            name="hand-left-outline"
            size={15}
            color={activeTab === "volunteer" ? "#3b5fca" : "#94a3b8"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "volunteer" && styles.tabTextActive,
            ]}
          >
            Sebagai Volunteer
          </Text>
          {activities.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "volunteer" && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === "volunteer" && styles.tabBadgeTextActive,
                ]}
              >
                {activities.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "victim" && styles.tabActive]}
          onPress={() => setActiveTab("victim")}
        >
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color={activeTab === "victim" ? "#3b5fca" : "#94a3b8"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "victim" && styles.tabTextActive,
            ]}
          >
            Request Saya
          </Text>
          {myRequests.length > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "victim" && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === "victim" && styles.tabBadgeTextActive,
                ]}
              >
                {myRequests.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5fca" />
          <Text style={styles.loadingText}>Memuat aktivitas...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name={
                activeTab === "volunteer"
                  ? "hand-left-outline"
                  : "alert-circle-outline"
              }
              size={48}
              color="#3b5fca"
            />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === "volunteer"
              ? "Belum Ada Aktivitas"
              : "Belum Ada Request"}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === "volunteer"
              ? "Kamu belum pernah menjadi volunteer. Yuk bantu orang di sekitarmu!"
              : "Kamu belum pernah membuat request bantuan."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === "volunteer" ? activities : myRequests}
          keyExtractor={(item) => item._id}
          renderItem={
            activeTab === "volunteer" ? renderActivity : renderRequest
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={
                activeTab === "volunteer" ? refetchActivities : refetchRequests
              }
              colors={["#3b5fca"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    marginBottom: 16,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statCard: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#fff" },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  tabActive: {
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#3b5fca",
  },
  tabText: { fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  tabTextActive: { color: "#3b5fca" },
  tabBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: "#3b5fca" },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  tabBadgeTextActive: { color: "#fff" },

  // List
  listContent: { padding: 16, gap: 12 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#64748b", fontSize: 14 },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardDate: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
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
  cardFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cardMetaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  cardMetaText: { fontSize: 11, color: "#94a3b8", flex: 1 },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  completeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
  },
  completeBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#ef4444" },
});
