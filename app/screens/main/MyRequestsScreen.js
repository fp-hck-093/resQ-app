import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
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
      photos
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

export default function MyRequestsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bottomSafe = Math.max(insets.bottom, 36);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const { data, loading, refetch } = useQuery(GET_MY_REQUESTS);
  const myRequests = data?.getMyRequests || [];
  const [completeRequest, { loading: completeLoading }] = useMutation(
    COMPLETE_REQUEST,
    {
      onCompleted: () => {
        refetch();
        setSelectedRequest(null);
      },
    },
  );
  const [deleteRequest, { loading: deleteLoading }] = useMutation(
    DELETE_REQUEST,
    {
      onCompleted: () => {
        refetch();
        setSelectedRequest(null);
      },
    },
  );

  const renderItem = ({ item }) => {
    const catConfig = CATEGORY_CONFIG[item.category] || {
      color: "#6b7280",
      bg: "#f9fafb",
      icon: "help-circle",
    };
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const busy = completeLoading || deleteLoading;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedRequest(item)}
      >
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
          <View
            style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusConfig.color },
              ]}
            />
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
        {item.status !== "completed" && (
          <View style={styles.cardActionRow}>
            {item.status === "in_progress" && (
              <TouchableOpacity
                style={styles.cardCompleteBtn}
                disabled={busy}
                onPress={() =>
                  setConfirmModal({
                    visible: true,
                    title: "Selesaikan Request",
                    message:
                      "Apakah bantuan sudah diterima dan request ini selesai?",
                    onConfirm: () =>
                      completeRequest({ variables: { id: item._id } }),
                  })
                }
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.cardCompleteBtnText}>Request Selesai</Text>
              </TouchableOpacity>
            )}
            {item.status === "pending" && (
              <TouchableOpacity
                style={styles.cardCancelBtn}
                disabled={busy}
                onPress={() =>
                  setConfirmModal({
                    visible: true,
                    title: "Batalkan Request",
                    message: "Apakah kamu yakin ingin membatalkan request ini?",
                    onConfirm: () =>
                      deleteRequest({ variables: { id: item._id } }),
                  })
                }
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.cardCancelBtnText}>Batalkan Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomSafe + 16 },
          ]}
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
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#3b5fca"
                />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Request</Text>
              <Text style={styles.emptyDesc}>
                Kamu belum pernah membuat request bantuan.
              </Text>
            </View>
          }
        />
      )}

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
                <Text style={styles.modalSubtitle}>Request Saya</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedRequest?.photos?.[0] ? (
                <Image
                  source={{ uri: selectedRequest.photos[0] }}
                  style={styles.modalRequestPhoto}
                />
              ) : (
                <View
                  style={[
                    styles.modalCategoryBadge,
                    {
                      backgroundColor:
                        (CATEGORY_CONFIG[selectedRequest?.category]?.color ||
                          "#3b5fca") + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      CATEGORY_CONFIG[selectedRequest?.category]?.icon ||
                      "help-circle"
                    }
                    size={32}
                    color={
                      CATEGORY_CONFIG[selectedRequest?.category]?.color ||
                      "#3b5fca"
                    }
                  />
                </View>
              )}
              <Text style={styles.modalDesc}>
                {selectedRequest?.description}
              </Text>
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

            {selectedRequest?.status === "completed" ? (
              <View style={styles.doneBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={styles.doneBadgeText}>Request sudah selesai</Text>
              </View>
            ) : (
              <View style={styles.actionRow}>
                {selectedRequest?.status === "in_progress" && (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    disabled={completeLoading || deleteLoading}
                    onPress={() =>
                      setConfirmModal({
                        visible: true,
                        title: "Selesaikan Request",
                        message:
                          "Apakah bantuan sudah diterima dan request ini selesai?",
                        onConfirm: () =>
                          completeRequest({
                            variables: { id: selectedRequest._id },
                          }),
                      })
                    }
                  >
                    {completeLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.completeBtnText}>
                          Request Selesai
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {selectedRequest?.status === "pending" && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    disabled={completeLoading || deleteLoading}
                    onPress={() =>
                      setConfirmModal({
                        visible: true,
                        title: "Batalkan Request",
                        message:
                          "Apakah kamu yakin ingin membatalkan request ini?",
                        onConfirm: () =>
                          deleteRequest({
                            variables: { id: selectedRequest._id },
                          }),
                      })
                    }
                  >
                    {deleteLoading ? (
                      <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#ef4444"
                        />
                        <Text style={styles.cancelBtnText}>
                          Batalkan Request
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
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
                onPress={() =>
                  setConfirmModal({ ...confirmModal, visible: false })
                }
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
  modalRequestPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#f1f5f9",
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
