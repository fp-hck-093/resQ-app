import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";

const GET_VOLUNTEER_HISTORY = gql`
  query GetVolunteerHistory {
    getMyActivityLogs(page: 1, limit: 50) {
      data {
        _id
        requestId
        status
        createdAt
        updatedAt
        request {
          _id
          category
          description
          address
          numberOfPeople
          status
          userName
        }
      }
      total
    }
  }
`;

const STATUS_CONFIG = {
  active: {
    color: "#3b5fca",
    bg: "#eff6ff",
    icon: "reload-outline",
    label: "Aktif",
  },
  completed: {
    color: "#22c55e",
    bg: "#f0fdf4",
    icon: "checkmark-circle-outline",
    label: "Selesai",
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

function normalizeStatus(status) {
  return status?.toLowerCase();
}

export default function VolunteerHistoryScreen({ navigation }) {
  const { data, loading, refetch } = useQuery(GET_VOLUNTEER_HISTORY);
  const histories = data?.getMyActivityLogs?.data || [];

  const renderItem = ({ item }) => {
    const request = item.request;
    const statusConfig =
      STATUS_CONFIG[normalizeStatus(item.status)] || STATUS_CONFIG.active;
    const catConfig = CATEGORY_CONFIG[request?.category] || {
      color: "#64748b",
      bg: "#f1f5f9",
      icon: "help-circle-outline",
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: catConfig.bg }]}>
            <Ionicons name={catConfig.icon} size={22} color={catConfig.color} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>
              {request?.category || "Request Bantuan"}
            </Text>
            <Text style={styles.cardSubtitle}>
              {request?.userName ? `Dari ${request.userName}` : `#${item.requestId.slice(-6).toUpperCase()}`}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={13} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {request?.description || "Detail request tidak tersedia"}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color="#94a3b8" />
            <Text style={styles.metaText}>
              {request?.numberOfPeople || 0} orang
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
            <Text style={styles.metaText}>
              {new Date(item.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color="#94a3b8" />
          <Text style={styles.locationText} numberOfLines={1}>
            {request?.address || "Lokasi tidak tersedia"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Volunteer History</Text>
          <Text style={styles.headerSubtitle}>
            {data?.getMyActivityLogs?.total || histories.length} aktivitas
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5fca" />
          <Text style={styles.loadingText}>Memuat riwayat volunteer...</Text>
        </View>
      ) : (
        <FlatList
          data={histories}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} colors={["#3b5fca"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
              <Text style={styles.emptyDesc}>
                Aktivitas bantuan yang kamu ambil akan muncul di sini.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  headerSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#64748b", fontSize: 14 },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  cardSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "800" },
  description: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginTop: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  locationText: { flex: 1, fontSize: 11, color: "#94a3b8" },
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
    backgroundColor: "#f0fdf4",
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
});
