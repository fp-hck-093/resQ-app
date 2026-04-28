import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

const GET_ME = gql`
  query GetMe {
    me {
      _id
      name
    }
  }
`;

const GET_ALL_REQUESTS = gql`
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
      createdAt
      volunteerIds
      location {
        type
        coordinates
      }
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

const CREATE_REQUEST = gql`
  mutation CreateRequest($input: CreateRequestInput!) {
    createRequest(input: $input) {
      _id
      category
      status
    }
  }
`;

const DEFAULT_LOCATION = { type: "Point", coordinates: [0, 0] };

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

const COMPLETE_REQUEST = gql`
  mutation CompleteRequest($id: String!) {
    completeRequest(id: $id) {
      _id
      status
    }
  }
`;

const DELETE_REQUEST = gql`
  mutation DeleteRequest($id: String!) {
    deleteRequest(id: $id)
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
  if (score === null || score === undefined)
    return { label: "Verifying...", color: "#94a3b8", loading: true };
  if (score >= 8)
    return { label: "Critical", color: "#ef4444", loading: false };
  if (score >= 5) return { label: "High", color: "#f97316", loading: false };
  return { label: "Low", color: "#22c55e", loading: false };
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, 36);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [volunteeredIds, setVolunteeredIds] = useState(new Set());
  const [myCompletedIds, setMyCompletedIds] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: "", message: "", onConfirm: null });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [form, setForm] = useState({
    description: "",
    category: "Rescue",
    numberOfPeople: "1",
    address: "",
  });

  const { data: meData } = useQuery(GET_ME);
  const currentUser = meData?.me;
  const filter = {
    ...(search ? { search } : {}),
    ...(selectedCategory !== "All" ? { category: selectedCategory } : {}),
    ...(selectedStatus !== "All" ? { status: selectedStatus } : {}),
    sortBy,
    sortOrder,
  };

  const { data, loading, refetch } = useQuery(GET_ALL_REQUESTS, {
    variables: { filter },
    pollInterval: 30000,
  });
  const { data: activityData, refetch: refetchActivities } = useQuery(
    GET_MY_ACTIVITY_LOGS,
  );

  const [volunteerForRequest, { loading: volunteerLoading }] = useMutation(
    VOLUNTEER_FOR_REQUEST,
    {
      onCompleted: (result) => {
        refetch();
        const rid = result?.volunteerForRequest?._id || selectedRequest?._id;
        if (!rid) return;
        setVolunteeredIds((prev) => new Set([...prev, rid]));
        setSelectedRequest((prev) => ({
          ...prev,
          status: result?.volunteerForRequest?.status ?? "in_progress",
          volunteerIds: result?.volunteerForRequest?.volunteerIds ?? prev?.volunteerIds,
        }));
      },
    },
  );

  const [updateActivityStatus, { loading: activityLoading }] = useMutation(
    UPDATE_ACTIVITY_STATUS,
  );

  const handleCompleteVolunteer = () => {
    const rid = selectedRequest._id;
    setMyCompletedIds((prev) => new Set([...prev, rid]));
    updateActivityStatus({
      variables: { requestId: rid, status: "COMPLETED" },
      onCompleted: () => {
        refetch();
        refetchActivities();
      },
      onError: (error) => {
        if (error.message?.includes("completed activity")) {
          setMyCompletedIds((prev) => new Set([...prev, rid]));
          refetchActivities();
          return;
        }

        setMyCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(rid);
          return next;
        });
        Alert.alert(
          "Gagal",
          error.message || "Tidak bisa menandai bantuan sebagai selesai.",
        );
      },
    });
  };

  const handleCancelVolunteer = () => {
    const rid = selectedRequest._id;
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
        setMyCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(rid);
          return next;
        });
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status:
                  (prev.volunteerIds || []).filter(
                    (id) => id !== currentUser?._id,
                  ).length > 0
                    ? "in_progress"
                    : "pending",
                volunteerIds: (prev.volunteerIds || []).filter(
                  (id) => id !== currentUser?._id,
                ),
              }
            : prev,
        );
      },
    });
  };

  const [completeRequest, { loading: completeLoading }] = useMutation(
    COMPLETE_REQUEST,
    { onCompleted: () => { refetch(); setSelectedRequest(null); } },
  );

  const [deleteRequest, { loading: deleteLoading }] = useMutation(
    DELETE_REQUEST,
    { onCompleted: () => { refetch(); setSelectedRequest(null); } },
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

  const filtered = data?.getRequests || [];
  const completedActivityIds = new Set([
    ...myCompletedIds,
    ...((activityData?.getMyActivityLogs?.data || [])
      .filter((activity) => activity.status?.toLowerCase() === "completed")
      .map((activity) => activity.requestId)),
  ]);

  useEffect(() => {
    if (selectedRequest && filtered.length > 0) {
      const updated = filtered.find((r) => r._id === selectedRequest._id);
      if (updated) setSelectedRequest(updated);
    }
  }, [data]);

  const handleCreateRequest = async () => {
    let location = DEFAULT_LOCATION;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({});
        location = {
          type: "Point",
          coordinates: [pos.coords.longitude, pos.coords.latitude],
        };
      }
    } catch {
      // use default location if GPS fails
    }

    createRequest({
      variables: {
        input: {
          description: form.description,
          category: form.category,
          numberOfPeople: parseInt(form.numberOfPeople),
          address: form.address,
          location,
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
              {urgencyConfig.loading ? (
                <ActivityIndicator size={10} color={urgencyConfig.color} />
              ) : null}
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
                  backgroundColor: STATUS_COLORS[item.status]
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
        <TouchableOpacity
          style={styles.filterIconBtn}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={20} color="#3b5fca" />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* FILTER TABS */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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
      </View>

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
          <View
            style={[styles.modalContent, { paddingBottom: bottomSafe + 20 }]}
          >
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
                      (CATEGORY_COLORS[selectedRequest?.category] ||
                        "#3b5fca") + "20",
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
                  Urgency Score:{" "}
                  {selectedRequest?.urgencyScore === null ||
                  selectedRequest?.urgencyScore === undefined
                    ? "Verifying..."
                    : `${selectedRequest.urgencyScore}/10`}
                </Text>
              </View>
            </ScrollView>

            {(() => {
              const isOwn = selectedRequest?.userId === currentUser?._id;
              const isVolunteered =
                volunteeredIds.has(selectedRequest?._id) ||
                (currentUser?._id && selectedRequest?.volunteerIds?.includes(currentUser._id));
              const status = selectedRequest?.status;
              const busy = volunteerLoading || activityLoading || completeLoading || deleteLoading;
              const confirm = (title, message, onConfirm) =>
                setConfirmModal({ visible: true, title, message, onConfirm });

              if (status === "completed") {
                return (
                  <View style={styles.ownerCompletedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    <Text style={styles.ownerCompletedText}>Request sudah selesai</Text>
                  </View>
                );
              }

              // Requester buttons
              if (isOwn) {
                return (
                  <View style={styles.volunteerActionRow}>
                    {status === "in_progress" && (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => confirm(
                          "Selesaikan Request",
                          "Apakah bantuan sudah kamu terima dan request ini selesai?",
                          () => completeRequest({ variables: { id: selectedRequest._id } }),
                        )}
                        disabled={busy}
                      >
                        {completeLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.completeBtnText}>Request Selesai</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                    {status === "pending" && (
                      <TouchableOpacity
                        style={[styles.cancelBtn, { flex: 1 }]}
                        onPress={() => confirm(
                          "Batalkan Request",
                          "Apakah kamu yakin ingin membatalkan request ini?",
                          () => deleteRequest({ variables: { id: selectedRequest._id } }),
                        )}
                        disabled={busy}
                      >
                        {deleteLoading ? <ActivityIndicator color="#ef4444" size="small" /> : (
                          <>
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                            <Text style={styles.cancelBtnText}>Batalkan Request</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }

              // Volunteer — already completed their part
              if (completedActivityIds.has(selectedRequest?._id)) {
                return (
                  <View style={styles.ownerCompletedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    <Text style={styles.ownerCompletedText}>Terima kasih telah membantu</Text>
                  </View>
                );
              }

              // Volunteer — not yet joined
              if (!isVolunteered) {
                return (
                  <TouchableOpacity
                    style={styles.volunteerBtn}
                    onPress={() => confirm(
                      "Konfirmasi",
                      "Apakah kamu yakin ingin membantu request ini?",
                      () => volunteerForRequest({ variables: { requestId: selectedRequest._id } }),
                    )}
                    disabled={busy}
                  >
                    {volunteerLoading ? <ActivityIndicator color="#fff" /> : (
                      <>
                        <Ionicons name="hand-left" size={20} color="#fff" />
                        <Text style={styles.volunteerBtnText}>Saya Mau Bantu!</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              }

              // Volunteer — already joined
              return (
                <View style={styles.volunteerActionRow}>
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={() => confirm(
                      "Selesai Membantu",
                      "Tandai partisipasimu sebagai selesai?",
                      handleCompleteVolunteer,
                    )}
                    disabled={busy}
                  >
                    {activityLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <Text style={styles.completeBtnText}>Selesai Membantu</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => confirm(
                      "Batalkan Partisipasi",
                      "Apakah kamu yakin ingin membatalkan partisipasimu?",
                      handleCancelVolunteer,
                    )}
                    disabled={busy}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                    <Text style={styles.cancelBtnText}>Batalkan</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* SORT & FILTER MODAL */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: bottomSafe + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sortLabel}>Status</Text>
            <View style={styles.sortRow}>
              {["All", "pending", "in_progress", "completed"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sortChip, selectedStatus === s && styles.sortChipActive]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text style={[styles.sortChipText, selectedStatus === s && styles.sortChipTextActive]}>
                    {s === "All" ? "All" : s.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sortLabel}>Sort By</Text>
            <View style={styles.sortRow}>
              {[
                { value: "createdAt", label: "Date" },
                { value: "urgencyScore", label: "Urgency" },
                { value: "numberOfPeople", label: "People" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortChip, sortBy === opt.value && styles.sortChipActive]}
                  onPress={() => setSortBy(opt.value)}
                >
                  <Text style={[styles.sortChipText, sortBy === opt.value && styles.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sortLabel}>Order</Text>
            <View style={styles.sortRow}>
              {[
                { value: "desc", label: "Newest first" },
                { value: "asc", label: "Oldest first" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.sortChip, sortOrder === opt.value && styles.sortChipActive]}
                  onPress={() => setSortOrder(opt.value)}
                >
                  <Text style={[styles.sortChipText, sortOrder === opt.value && styles.sortChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSelectedStatus("All");
                  setSortBy("createdAt");
                  setSortOrder("desc");
                }}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CREATE REQUEST MODAL */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { paddingBottom: bottomSafe + 20 }]}
          >
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
              onPress={() => void handleCreateRequest()}
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

      {/* CONFIRMATION MODAL */}
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

  filterWrapper: {
    height: 60,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    flexGrow: 1,
  },
  filterChip: {
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
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

  volunteerActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  completeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 13,
  },
  completeBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700", color: "#ef4444" },

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

  ownerCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  ownerCompletedText: { fontSize: 14, fontWeight: "700", color: "#22c55e" },

  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  confirmCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  confirmMessage: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20, marginBottom: 24 },
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },

  sortLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 14,
    marginBottom: 8,
  },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  sortChipActive: { backgroundColor: "#3b5fca", borderColor: "#3b5fca" },
  sortChipText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  sortChipTextActive: { color: "#fff" },

  filterActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  resetBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  resetBtnText: { color: "#64748b", fontWeight: "700", fontSize: 15 },
  applyBtn: {
    flex: 1,
    backgroundColor: "#3b5fca",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
