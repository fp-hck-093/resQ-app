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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";

const GET_ALL_REQUESTS = gql`
  query GetRequests {
    getRequests {
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

const CREATE_REQUEST = gql`
  mutation CreateRequest($input: CreateRequestInput!) {
    createRequest(input: $input) {
      _id
      category
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

const CATEGORY_ICONS = {
  Rescue: "warning",
  Shelter: "home",
  Food: "fast-food",
  Medical: "medkit",
  "Money/Item": "cash",
};

const CATEGORY_COLORS = {
  Rescue: "#ef4444",
  Shelter: "#8b5cf6",
  Food: "#f97316",
  Medical: "#3b82f6",
  "Money/Item": "#22c55e",
};

const STATUS_COLORS = {
  pending: "#ef4444",
  in_progress: "#f97316",
  completed: "#22c55e",
};

const CATEGORIES = ["Rescue", "Shelter", "Food", "Medical", "Money/Item"];

function getUrgencyConfig(score) {
  if (score >= 8) return { label: "Critical", color: "#ef4444" };
  if (score >= 5) return { label: "High", color: "#f97316" };
  return { label: "Low", color: "#22c55e" };
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState({
    description: "",
    category: "Rescue",
    numberOfPeople: "1",
    address: "",
  });

  const { data, loading, refetch } = useQuery(GET_ALL_REQUESTS, {
    pollInterval: 30000,
  });

  const [volunteerForRequest, { loading: volunteerLoading }] = useMutation(
    VOLUNTEER_FOR_REQUEST,
    {
      onCompleted: () => {
        refetch();
        setSelectedRequest(null);
      },
    },
  );

  const [createRequest, { loading: createLoading }] = useMutation(
    CREATE_REQUEST,
    {
      onCompleted: () => {
        refetch();
        setShowCreateModal(false);
        setForm({
          description: "",
          category: "Rescue",
          numberOfPeople: "1",
          address: "",
        });
      },
    },
  );

  const requests = data?.getRequests || [];
  const filtered =
    selectedCategory === "All"
      ? requests
      : requests.filter((r) => r.category === selectedCategory);

  const handleCreateRequest = () => {
    createRequest({
      variables: {
        input: {
          description: form.description,
          category: form.category,
          numberOfPeople: parseInt(form.numberOfPeople),
          address: form.address,
        },
      },
    });
  };

  const renderRequest = ({ item }) => {
    const urgencyConfig = getUrgencyConfig(item.urgencyScore);

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => setSelectedRequest(item)}
      >
        <View style={styles.requestCardLeft}>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: CATEGORY_COLORS[item.category] + "20" },
            ]}
          >
            <Ionicons
              name={CATEGORY_ICONS[item.category] || "help-circle"}
              size={22}
              color={CATEGORY_COLORS[item.category] || "#6b7280"}
            />
          </View>
        </View>
        <View style={styles.requestCardContent}>
          <View style={styles.requestCardHeader}>
            <Text style={styles.requestCategory}>{item.category}</Text>
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
          <Text style={styles.requestDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.requestMeta}>
            <Ionicons name="location-outline" size={12} color="#94a3b8" />
            <Text style={styles.requestMetaText} numberOfLines={1}>
              {item.address || "Lokasi tidak tersedia"}
            </Text>
          </View>
          <View style={styles.requestFooter}>
            <View style={styles.requestMetaItem}>
              <Ionicons name="people-outline" size={12} color="#94a3b8" />
              <Text style={styles.requestMetaText}>
                {item.numberOfPeople} orang
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    STATUS_COLORS[item.status]
                      ? STATUS_COLORS[item.status] + "20"
                      : "#f1f5f9",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: STATUS_COLORS[item.status] || "#64748b" },
                ]}
              >
                {item.status?.replace("_", " ")}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Requests</Text>
          <Text style={styles.headerSubtitle}>
            {filtered.length} request aktif
          </Text>
        </View>
      </View>

      {/* FILTER TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {["All", ...CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterChip,
              selectedCategory === cat && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === cat && styles.filterChipTextActive,
              ]}
            >
              {cat}
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
          contentContainerStyle={styles.listContent}
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
              <Text style={styles.emptyText}>Tidak ada request aktif</Text>
            </View>
          }
        />
      )}

      {/* DETAIL MODAL */}
      <Modal visible={!!selectedRequest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
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
              <View
                style={[
                  styles.modalCategoryBadge,
                  {
                    backgroundColor:
                      (CATEGORY_COLORS[selectedRequest?.category] || "#3b5fca") +
                      "20",
                  },
                ]}
              >
                <Ionicons
                  name={
                    CATEGORY_ICONS[selectedRequest?.category] || "help-circle"
                  }
                  size={32}
                  color={
                    CATEGORY_COLORS[selectedRequest?.category] || "#3b5fca"
                  }
                />
              </View>

              <Text style={styles.modalDesc}>
                {selectedRequest?.description}
              </Text>

              <View style={styles.modalInfoRow}>
                <Ionicons name="person-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  {selectedRequest?.userName} • {selectedRequest?.userPhone}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="people-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  {selectedRequest?.numberOfPeople} orang terdampak
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  {selectedRequest?.address || "Lokasi tidak tersedia"}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="warning-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  Urgency Score: {selectedRequest?.urgencyScore}/10
                </Text>
              </View>
            </ScrollView>

            {selectedRequest?.status === "pending" && (
              <TouchableOpacity
                style={styles.volunteerBtn}
                onPress={() =>
                  volunteerForRequest({
                    variables: { requestId: selectedRequest._id },
                  })
                }
                disabled={volunteerLoading}
              >
                {volunteerLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="hand-left" size={20} color="#fff" />
                    <Text style={styles.volunteerBtnText}>Saya Mau Bantu!</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* CREATE REQUEST MODAL */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Minta Bantuan</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Kategori Bantuan</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      form.category === cat && {
                        backgroundColor: CATEGORY_COLORS[cat],
                      },
                    ]}
                    onPress={() => setForm({ ...form, category: cat })}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[cat]}
                      size={14}
                      color={form.category === cat ? "#fff" : "#64748b"}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        form.category === cat && { color: "#fff" },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Deskripsi Situasi</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Ceritakan situasi yang kamu alami..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={(text) => setForm({ ...form, description: text })}
              />

              <Text style={styles.inputLabel}>Jumlah Orang Terdampak</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: 5"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={form.numberOfPeople}
                onChangeText={(text) =>
                  setForm({ ...form, numberOfPeople: text })
                }
              />

              <Text style={styles.inputLabel}>Alamat / Lokasi</Text>
              <TextInput
                style={styles.input}
                placeholder="Masukkan alamat lengkap..."
                placeholderTextColor="#94a3b8"
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, createLoading && { opacity: 0.7 }]}
              onPress={handleCreateRequest}
              disabled={createLoading}
            >
              {createLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Kirim Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  headerSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  filterIconBtn: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  filterScroll: { maxHeight: 52, backgroundColor: "#fff" },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterChipActive: { backgroundColor: "#3b5fca", borderColor: "#3b5fca" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: "#fff" },

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
    gap: 12,
  },
  emptyText: { color: "#94a3b8", fontSize: 16, fontWeight: "600" },

  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestCardLeft: { alignItems: "center", justifyContent: "flex-start" },
  categoryIcon: { padding: 10, borderRadius: 12 },
  requestCardContent: { flex: 1 },
  requestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  requestCategory: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  urgencyText: { fontSize: 11, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700" },
  requestDesc: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
    lineHeight: 18,
  },
  requestMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  requestFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  requestMetaText: { fontSize: 11, color: "#94a3b8" },

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
    maxHeight: "85%",
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
  modalSubtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  modalCategoryBadge: {
    alignSelf: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  modalDesc: {
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 22,
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  modalInfoText: { fontSize: 14, color: "#64748b" },

  volunteerBtn: {
    backgroundColor: "#3b5fca",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    marginTop: 16,
  },
  volunteerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 16,
    height: 100,
    textAlignVertical: "top",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryChipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },

  submitBtn: {
    backgroundColor: "#3b5fca",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
