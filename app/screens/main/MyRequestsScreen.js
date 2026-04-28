import React from "react";
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
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";

const GET_MY_REQUESTS = gql`
  query GetMyRequests {
    getMyRequests {
      _id
      category
      description
      status
      address
      numberOfPeople
      urgencyScore
      createdAt
    }
  }
`;

const CATEGORY_CONFIG = {
  Rescue: { color: "#ef4444", bg: "#fef2f2", icon: "warning" },
  Shelter: { color: "#8b5cf6", bg: "#f5f3ff", icon: "home" },
  Food: { color: "#f97316", bg: "#fff7ed", icon: "fast-food" },
  Medical: { color: "#3b82f6", bg: "#eff6ff", icon: "medkit" },
  "Money/Item": { color: "#22c55e", bg: "#f0fdf4", icon: "cash" },
};

const STATUS_CONFIG = {
  pending: { color: "#f97316", bg: "#fff7ed", label: "Pending" },
  in_progress: { color: "#3b5fca", bg: "#eff6ff", label: "In Progress" },
  completed: { color: "#22c55e", bg: "#f0fdf4", label: "Selesai" },
};

export default function MyRequestsScreen({ navigation }) {
  const { data, loading, refetch } = useQuery(GET_MY_REQUESTS);
  const myRequests = data?.getMyRequests || [];

  const renderItem = ({ item }) => {
    const catConfig = CATEGORY_CONFIG[item.category] || {
      color: "#6b7280",
      bg: "#f9fafb",
      icon: "help-circle",
    };
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    return (
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={[styles.cardIcon, { backgroundColor: catConfig.bg }]}>
            <Ionicons name={catConfig.icon} size={22} color={catConfig.color} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.category}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color="#94a3b8" />
            <Text style={styles.metaText}>{item.numberOfPeople} orang</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color="#94a3b8" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.address || "Lokasi tidak tersedia"}
            </Text>
          </View>
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
          <Text style={styles.headerTitle}>My Requests</Text>
          <Text style={styles.headerSubtitle}>{myRequests.length} request</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5fca" />
          <Text style={styles.loadingText}>Memuat requests...</Text>
        </View>
      ) : (
        <FlatList
          data={myRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refetch}
              colors={["#3b5fca"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="alert-circle-outline" size={48} color="#3b5fca" />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Request</Text>
              <Text style={styles.emptyDesc}>
                Kamu belum pernah membuat request bantuan.
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

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 14 },

  listContent: { padding: 16, gap: 12 },

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
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardDesc: { fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 16 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  metaText: { fontSize: 11, color: "#94a3b8", flex: 1 },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
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
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  emptyDesc: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
});
