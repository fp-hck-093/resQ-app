import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

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

const UPDATE_ACTIVITY_STATUS = gql`
  mutation UpdateActivityStatus($requestId: String!, $status: ActivityLogStatus!) {
    updateActivityStatus(requestId: $requestId, status: $status) {
      _id
      status
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
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, 36);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const { data, loading, error, refetch } = useQuery(GET_VOLUNTEER_HISTORY, {
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const histories = data?.getMyActivityLogs?.data || [];
  const [updateActivityStatus, { loading: updateLoading }] = useMutation(
    UPDATE_ACTIVITY_STATUS,
    {
      onCompleted: () => {
        refetch();
        setSelectedActivity(null);
      },
    },
  );

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const renderItem = ({ item }) => {
    const request = item.request;
    const itemStatus = normalizeStatus(item.status);
    const statusConfig =
      STATUS_CONFIG[itemStatus] || STATUS_CONFIG.active;
    const catConfig = CATEGORY_CONFIG[request?.category] || {
      color: "#64748b",
      bg: "#f1f5f9",
      icon: "help-circle-outline",
    };

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedActivity(item)}>
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
        {itemStatus === "active" && (
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.cardCompleteBtn}
              disabled={updateLoading}
              onPress={() =>
                setConfirmModal({
                  visible: true,
                  title: "Selesai Membantu",
                  message: "Tandai partisipasimu sebagai selesai?",
                  onConfirm: () =>
                    updateActivityStatus({
                      variables: { requestId: item.requestId, status: "COMPLETED" },
                    }),
                })
              }
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.cardCompleteBtnText}>Selesai Membantu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cardCancelBtn}
              disabled={updateLoading}
              onPress={() =>
                setConfirmModal({
                  visible: true,
                  title: "Batalkan Partisipasi",
                  message: "Apakah kamu yakin ingin membatalkan partisipasimu?",
                  onConfirm: () =>
                    updateActivityStatus({
                      variables: { requestId: item.requestId, status: "CANCELLED" },
                    }),
                })
              }
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.cardCancelBtnText}>Batalkan</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
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
      ) : error ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          </View>
          <Text style={styles.emptyTitle}>Riwayat Gagal Dimuat</Text>
          <Text style={styles.emptyDesc}>{error.message}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={histories}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomSafe + 16 },
          ]}
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

      <Modal visible={!!selectedActivity} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: bottomSafe + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedActivity?.request?.category || "Request Bantuan"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedActivity?.request?.userName
                    ? `Dari ${selectedActivity.request.userName}`
                    : `#${selectedActivity?.requestId?.slice(-6).toUpperCase()}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedActivity(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={[
                  styles.modalCategoryBadge,
                  {
                    backgroundColor:
                      (CATEGORY_CONFIG[selectedActivity?.request?.category]?.color || "#3b5fca") +
                      "20",
                  },
                ]}
              >
                <Ionicons
                  name={
                    CATEGORY_CONFIG[selectedActivity?.request?.category]?.icon ||
                    "help-circle-outline"
                  }
                  size={32}
                  color={
                    CATEGORY_CONFIG[selectedActivity?.request?.category]?.color ||
                    "#3b5fca"
                  }
                />
              </View>
              <Text style={styles.modalDesc}>
                {selectedActivity?.request?.description || "Detail request tidak tersedia"}
              </Text>
              <View style={styles.modalInfoRow}>
                <Ionicons name="people-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  {selectedActivity?.request?.numberOfPeople || 0} orang terdampak
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  {selectedActivity?.request?.address || "Lokasi tidak tersedia"}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  Status bantuan:{" "}
                  {STATUS_CONFIG[normalizeStatus(selectedActivity?.status)]?.label || "Aktif"}
                </Text>
              </View>
            </ScrollView>

            {normalizeStatus(selectedActivity?.status) === "active" ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.completeBtn}
                  disabled={updateLoading}
                  onPress={() =>
                    setConfirmModal({
                      visible: true,
                      title: "Selesai Membantu",
                      message: "Tandai partisipasimu sebagai selesai?",
                      onConfirm: () =>
                        updateActivityStatus({
                          variables: {
                            requestId: selectedActivity.requestId,
                            status: "COMPLETED",
                          },
                        }),
                    })
                  }
                >
                  {updateLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.completeBtnText}>Selesai Membantu</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  disabled={updateLoading}
                  onPress={() =>
                    setConfirmModal({
                      visible: true,
                      title: "Batalkan Partisipasi",
                      message: "Apakah kamu yakin ingin membatalkan partisipasimu?",
                      onConfirm: () =>
                        updateActivityStatus({
                          variables: {
                            requestId: selectedActivity.requestId,
                            status: "CANCELLED",
                          },
                        }),
                    })
                  }
                >
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={styles.cancelBtnText}>Batalkan</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.doneBadge}>
                <Ionicons
                  name={
                    normalizeStatus(selectedActivity?.status) === "completed"
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={18}
                  color={
                    normalizeStatus(selectedActivity?.status) === "completed"
                      ? "#22c55e"
                      : "#ef4444"
                  }
                />
                <Text
                  style={[
                    styles.doneBadgeText,
                    normalizeStatus(selectedActivity?.status) === "cancelled" && {
                      color: "#ef4444",
                    },
                  ]}
                >
                  {normalizeStatus(selectedActivity?.status) === "completed"
                    ? "Terima kasih telah membantu"
                    : "Partisipasi dibatalkan"}
                </Text>
              </View>
            )}
          </View>
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
  cardActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cardCompleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingVertical: 10,
  },
  cardCompleteBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  cardCancelBtn: {
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
  cardCancelBtnText: { fontSize: 12, fontWeight: "800", color: "#ef4444" },
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
  retryBtn: {
    backgroundColor: "#3b5fca",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6,
  },
  retryBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
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
  modalInfoText: { flex: 1, fontSize: 14, color: "#64748b" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
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
  doneBadge: {
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
  doneBadgeText: { fontSize: 14, fontWeight: "700", color: "#22c55e" },
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
});
