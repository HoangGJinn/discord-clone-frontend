import { FriendItem } from "@/components/FriendItem";
import { ThemedText } from "@/components/themed-text";
import { DiscordColors, Spacing } from "@/constants/theme";
import {
  FriendshipResponse,
  useFriendStore,
} from "@/store/useFriendStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type TabType = "ALL" | "PENDING" | "SENT";

const TABS: { key: TabType; label: string }[] = [
  { key: "ALL", label: "Friends" },
  { key: "PENDING", label: "Pending" },
  { key: "SENT", label: "Sent" },
];

const mapStatusText = (status?: string | null): string => {
  if (!status) return "Offline";
  const normalized = status.toUpperCase();
  if (normalized === "ONLINE") return "Online";
  if (normalized === "IDLE") return "Idle";
  if (normalized === "DND") return "Do Not Disturb";
  return "Offline";
};

export default function FriendsScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = Number(currentUser?.id ?? 0);

  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const {
    friends,
    receivedRequests,
    sentRequests,
    isLoading,
    error,
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    clearError,
  } = useFriendStore();

  const loadData = useCallback(async () => {
    if (activeTab === "ALL") {
      await fetchFriends();
      return;
    }
    if (activeTab === "PENDING") {
      await fetchReceivedRequests();
      return;
    }
    await fetchSentRequests();
  }, [activeTab, fetchFriends, fetchReceivedRequests, fetchSentRequests]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const listData = useMemo(() => {
    if (activeTab === "ALL") return friends;
    if (activeTab === "PENDING") return receivedRequests;
    return sentRequests;
  }, [activeTab, friends, receivedRequests, sentRequests]);

  const resolveDisplayUser = useCallback(
    (item: FriendshipResponse) => {
      const currentIsSender = item.senderId === currentUserId;
      if (currentIsSender) {
        return {
          userId: item.receiverId,
          username: item.receiverUsername,
          displayName: item.receiverDisplayName || item.receiverUsername,
          avatarUrl: item.receiverAvatarUrl || undefined,
          status: item.receiverStatus,
        };
      }
      return {
        userId: item.senderId,
        username: item.senderUsername,
        displayName: item.senderDisplayName || item.senderUsername,
        avatarUrl: item.senderAvatarUrl || undefined,
        status: item.senderStatus,
      };
    },
    [currentUserId],
  );

  const handleAccept = useCallback(
    async (friendshipId: number) => {
      try {
        await acceptFriendRequest(friendshipId);
      } catch (err) {
        Alert.alert("Cannot accept request", err instanceof Error ? err.message : "Request failed");
      }
    },
    [acceptFriendRequest],
  );

  const handleReject = useCallback(
    async (friendshipId: number) => {
      try {
        await rejectFriendRequest(friendshipId);
      } catch (err) {
        Alert.alert("Cannot reject request", err instanceof Error ? err.message : "Request failed");
      }
    },
    [rejectFriendRequest],
  );

  const handleCancel = useCallback(
    async (friendshipId: number) => {
      try {
        await cancelFriendRequest(friendshipId);
      } catch (err) {
        Alert.alert("Cannot cancel request", err instanceof Error ? err.message : "Request failed");
      }
    },
    [cancelFriendRequest],
  );

  const renderFriendItem = ({ item, index }: { item: FriendshipResponse; index: number }) => {
    const displayUser = resolveDisplayUser(item);

    return (
      <FriendItem
        id={item.id}
        userId={displayUser.userId}
        username={displayUser.username}
        displayName={displayUser.displayName}
        avatar={displayUser.avatarUrl}
        statusText={mapStatusText(displayUser.status)}
        presenceStatus={displayUser.status}
        type={activeTab}
        onAccept={() => handleAccept(item.id)}
        onReject={() => handleReject(item.id)}
        onCancel={() => handleCancel(item.id)}
        index={index}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Friends</ThemedText>
        <TouchableOpacity style={styles.addFriendBtn} onPress={() => router.push("/friends/add")}>
          <ThemedText style={styles.addFriendText}>Add Friend</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => {
              clearError();
              setActiveTab(tab.key);
            }}
            style={[styles.tabItem, activeTab === tab.key && styles.activeTab]}
          >
            <ThemedText style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      <FlatList
        data={listData}
        renderItem={renderFriendItem}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={DiscordColors.blurple} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>Nothing here yet.</ThemedText>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: DiscordColors.textPrimary,
  },
  addFriendBtn: {
    backgroundColor: DiscordColors.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addFriendText: {
    color: "#fff",
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "rgba(78, 80, 88, 0.6)",
  },
  tabLabel: {
    fontSize: 15,
    color: DiscordColors.textSecondary,
    fontWeight: "600",
  },
  activeTabLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  errorBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: "rgba(237,66,69,0.2)",
    borderColor: "rgba(237,66,69,0.6)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    color: "#ffb7b9",
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    color: DiscordColors.textMuted,
    fontSize: 16,
  },
});
