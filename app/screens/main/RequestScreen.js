import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
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
      createdAt
      location {
        type
        coordinates
      }
    }
  }
`;

const GET_MY_ACTIVITIES = gql`
  query GetMyActivities {
    getMyActivities {
      _id
      requestId
      status
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

const CATEGORY_CONFIG = {
  Rescue: { color: "#ef4444", bg: "#fef2f2", icon: "warning", emoji: "🚨" },
  Shelter: { color: "#8b5cf6", bg: "#f5f3ff", icon: "home", emoji: "🏠" },
  Food: { color: "#f97316", bg: "#fff7ed", icon: "fast-food", emoji: "🍚" },
  Medical: { color: "#3b82f6", bg: "#eff6ff", icon: "medkit", emoji: "💊" },
  "Money/Item": { color: "#22c55e", bg: "#f0fdf4", icon: "cash", emoji: "💰" },
};

const URGENCY_CONFIG = {
  high: { color: "#ef4444", label: "high" },
  medium: { color: "#f97316", label: "medium" },
  low: { color: "#22c55e", label: "low" },
  critical: { color: "#dc2626", label: "critical" },
};

const getUrgencyLevel = (score) => {
  if (score >= 8) return "critical";
  if (score >= 6) return "high";
  if (score >= 4) return "medium";
  return "low";
};

const getTimeAgo = (createdAt) => {
  if (!createdAt) return "";
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
};

export default function RequestsScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Nearest");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const { data, loading, refetch } = useQuery(GET_ALL_REQUESTS, {
    pollInterval: 30000,
  });
  const { data: activitiesData } = useQuery(GET_MY_ACTIVITIES);

  const [volunteerForRequest, { loading: volunteerLoading }] = useMutation(
    VOLUNTEER_FOR_REQUEST,
    {
      onCompleted: () => {
        refetch();
        setSelectedRequest(null);
      },
    },
  );

  const requests = data?.getAllRequests || [];
  const myActivities = activitiesData?.getMyActivities || [];
  const activeTask = myActivities.find((a) => a.status === "active");
  const activeTaskRequest = activeTask
    ? requests.find((r) => r._id === activeTask.requestId)
    : null;

  const filtered = requests
    .filter((r) => r.status !== "completed")
    .filter(
      (r) =>
        search === "" ||
        r.description?.toLowerCase().includes(search.toLowerCase()) ||
        r.category?.toLowerCase().includes(search.toLowerCase()) ||
        r.address?.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (activeFilter === "Most Urgent")
        return (b.urgencyScore || 0) - (a.urgencyScore || 0);
      if (activeFilter === "Newest")
        return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const renderRequest = ({ item }) => {
    const catConfig = CATEGORY_CONFIG[item.category] || {
      color: "#6b7280",
      bg: "#f9fafb",
      icon: "help-circle",
      emoji: "❓",
    };
    const urgencyLevel = getUrgencyLevel(item.urgencyScore || 0);
    const urgencyConfig = URGENCY_CONFIG[urgencyLevel];
    const isAccepted = item.status === "in_progress";

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => setSelectedRequest(item)}
        activeOpacity={0.8}
      >
        <View style={styles.requestCardLeft}>
          <View
            style={[styles.categoryIconWrap, { backgroundColor: catConfig.bg }]}
          >
            <Text style={styles.categoryEmoji}>{catConfig.emoji}</Text>
          </View>
        </View>

        <View style={styles.requestCardBody}>
          <View style={styles.requestCardTop}>
            <Text style={styles.requestTitle} numberOfLines={1}>
              {item.category} needed for {item.numberOfPeople}{" "}
              {item.numberOfPeople > 1 ? "people" : "person"}
            </Text>
            <View
              style={[
                styles.urgencyBadge,
                { backgroundColor: urgencyConfig.color + "20" },
              ]}
            >
              <Text
                style={[styles.urgencyText, { color: urgencyConfig.color }]}
              >
                {urgencyConfig.label}
              </Text>
            </View>
          </View>

          <Text style={styles.requestDesc} numberOfLines={1}>
            {item.description}
          </Text>

          <View style={styles.requestMeta}>
            <View style={styles.requestMetaItem}>
              <Ionicons name="navigate-outline" size={11} color="#94a3b8" />
              <Text style={styles.requestMetaText}>2.3km</Text>
            </View>
            <View style={styles.requestMetaItem}>
              <Ionicons name="people-outline" size={11} color="#94a3b8" />
              <Text style={styles.requestMetaText}>
                {item.numberOfPeople} people
              </Text>
            </View>
            <View style={styles.requestMetaItem}>
              <Ionicons name="time-outline" size={11} color="#94a3b8" />
              <Text style={styles.requestMetaText}>
                {getTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.requestCardBottom}>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: isAccepted ? "#f0fdf4" : "#fef9f0" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isAccepted ? "#22c55e" : "#f97316" },
                ]}
              />
              <Text
                style={[
                  styles.statusChipText,
                  { color: isAccepted ? "#22c55e" : "#f97316" },
                ]}
              >
                {item.status?.replace("_", " ")}
              </Text>
            </View>

            {!isAccepted && (
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() =>
                  volunteerForRequest({ variables: { requestId: item._id } })
                }
                disabled={volunteerLoading}
              >
                <LinearGradient
                  colors={["#3b5fca", "#5b7ee5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.acceptBtnGradient}
                >
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
        <Text style={styles.headerSubtitle}>
          {filtered.length} request aktif
        </Text>
      </View>

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={18} color="#3b5fca" />
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {[
          "Nearest",
          "Most Urgent",
          "Newest",
          "Medical",
          "Food",
          "Rescue",
          "Shelter",
        ].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              activeFilter === f && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === f && styles.filterTabTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* REQUEST LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5fca" />
          <Text style={styles.loadingText}>Memuat requests...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderRequest}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: activeTaskRequest ? 120 : 16 },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={60}
                color="#e2e8f0"
              />
              <Text style={styles.emptyTitle}>Tidak ada request</Text>
              <Text style={styles.emptyDesc}>
                Semua sudah tertangani atau belum ada request baru
              </Text>
            </View>
          }
        />
      )}

      {/* ACTIVE TASK BAR */}
      {activeTaskRequest && (
        <View style={styles.activeTaskBar}>
          <LinearGradient
            colors={["#1e3a8a", "#3b5fca"]}
            style={styles.activeTaskGradient}
          >
            <View style={styles.activeTaskLeft}>
              <View style={styles.activeTaskIconWrap}>
                <Text style={styles.activeTaskEmoji}>
                  {CATEGORY_CONFIG[activeTaskRequest.category]?.emoji || "🆘"}
                </Text>
              </View>
              <View>
                <View style={styles.activeTaskBadge}>
                  <Ionicons name="flash" size={10} color="#fbbf24" />
                  <Text style={styles.activeTaskBadgeText}>ACTIVE TASK</Text>
                </View>
                <Text style={styles.activeTaskTitle} numberOfLines={1}>
                  {activeTaskRequest.category} assistance delivery
                </Text>
                <Text style={styles.activeTaskSub}>
                  In Progress • 2.5km away
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewTaskBtn}>
              <Text style={styles.viewTaskBtnText}>View{"\n"}Task</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* DETAIL MODAL */}
      <Modal visible={!!selectedRequest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalCategoryWrap,
                  {
                    backgroundColor:
                      CATEGORY_CONFIG[selectedRequest?.category]?.bg ||
                      "#f9fafb",
                  },
                ]}
              >
                <Text style={styles.modalEmoji}>
                  {CATEGORY_CONFIG[selectedRequest?.category]?.emoji || "❓"}
                </Text>
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>
                  {selectedRequest?.category}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedRequest?.userName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                {selectedRequest?.description}
              </Text>

              <View style={styles.modalInfoGrid}>
                <View style={styles.modalInfoItem}>
                  <Ionicons name="people-outline" size={16} color="#3b5fca" />
                  <Text style={styles.modalInfoLabel}>Orang terdampak</Text>
                  <Text style={styles.modalInfoValue}>
                    {selectedRequest?.numberOfPeople}
                  </Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Ionicons name="warning-outline" size={16} color="#ef4444" />
                  <Text style={styles.modalInfoLabel}>Urgency Score</Text>
                  <Text style={styles.modalInfoValue}>
                    {selectedRequest?.urgencyScore}/10
                  </Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Ionicons name="location-outline" size={16} color="#22c55e" />
                  <Text style={styles.modalInfoLabel}>Lokasi</Text>
                  <Text style={styles.modalInfoValue} numberOfLines={2}>
                    {selectedRequest?.address || "N/A"}
                  </Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Ionicons name="time-outline" size={16} color="#f97316" />
                  <Text style={styles.modalInfoLabel}>Waktu</Text>
                  <Text style={styles.modalInfoValue}>
                    {getTimeAgo(selectedRequest?.createdAt)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {selectedRequest?.status === "pending" && (
              <TouchableOpacity
                style={styles.modalVolunteerBtn}
                onPress={() =>
                  volunteerForRequest({
                    variables: { requestId: selectedRequest._id },
                  })
                }
                disabled={volunteerLoading}
              >
                <LinearGradient
                  colors={["#3b5fca", "#5b7ee5"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalVolunteerBtnGradient}
                >
                  {volunteerLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="hand-left" size={20} color="#fff" />
                      <Text style={styles.modalVolunteerBtnText}>
                        Saya Mau Bantu!
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#3b5fca",
    borderBottomWidth: 1,
    borderBottomColor: "#3b5fca",
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#f2f3f5" },
  headerSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  filterIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },

  // Filter Tabs
  filterScroll: { maxHeight: 50, backgroundColor: "#fff" },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterTabActive: { backgroundColor: "#3b5fca", borderColor: "#3b5fca" },
  filterTabText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  filterTabTextActive: { color: "#fff" },

  // List
  listContent: { padding: 16, gap: 12 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#64748b", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  emptyDesc: { fontSize: 13, color: "#94a3b8", textAlign: "center" },

  // Request Card
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  requestCardLeft: { alignItems: "center", justifyContent: "flex-start" },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryEmoji: { fontSize: 24 },
  requestCardBody: { flex: 1 },
  requestCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  urgencyText: { fontSize: 10, fontWeight: "800" },
  requestDesc: { fontSize: 12, color: "#64748b", marginBottom: 6 },
  requestMeta: { flexDirection: "row", gap: 10, marginBottom: 10 },
  requestMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  requestMetaText: { fontSize: 11, color: "#94a3b8" },
  requestCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontWeight: "700" },
  acceptBtn: { borderRadius: 10, overflow: "hidden" },
  acceptBtnGradient: { paddingHorizontal: 18, paddingVertical: 8 },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Active Task Bar
  activeTaskBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  activeTaskGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activeTaskLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  activeTaskIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  activeTaskEmoji: { fontSize: 22 },
  activeTaskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  activeTaskBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fbbf24",
    letterSpacing: 0.5,
  },
  activeTaskTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  activeTaskSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  viewTaskBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  viewTaskBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#3b5fca",
    textAlign: "center",
  },

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
    maxHeight: "80%",
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
    gap: 12,
    marginBottom: 16,
  },
  modalCategoryWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmoji: { fontSize: 26 },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  modalSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  modalDesc: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 22,
    marginBottom: 16,
  },
  modalInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  modalInfoItem: {
    width: "47%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  modalInfoLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  modalInfoValue: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  modalVolunteerBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  modalVolunteerBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  modalVolunteerBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
