import { FriendItem } from "@/components/FriendItem";
import { ThemedText } from "@/components/themed-text";
import { useFriendStore } from "@/store/useFriendStore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { DiscordColors, Spacing } from "@/constants/theme";

type TabType = "ALL" | "PENDING" | "SENT";

const TABS: TabType[] = ["ALL", "PENDING", "SENT"];

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const {
    friends,
    receivedRequests,
    sentRequests,
    isLoading,
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
  } = useFriendStore();

  const loadData = () => {
    const fetchers = {
      ALL: fetchFriends,
      PENDING: fetchReceivedRequests,
      SENT: fetchSentRequests,
    };
    fetchers[activeTab]();
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const renderFriendItem = ({ item }: { item: any }) => {
    const username = item.username || item.friend?.username;
    const avatar = item.avatar || item.friend?.avatar;

    return (
      <FriendItem
        id={item.id}
        username={username}
        avatar={avatar}
        statusText={item.status || "Away"}
        type={activeTab}
        onAccept={() => acceptFriendRequest(item.id)}
        onReject={() => rejectFriendRequest(item.id)}
        onCancel={() => cancelFriendRequest(item.id)}
      />
    );
  };

  const getListData = () => {
    if (activeTab === "ALL") return friends;
    if (activeTab === "PENDING") return receivedRequests;
    return sentRequests;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Friends</ThemedText>
        <TouchableOpacity style={styles.addFriendBtn}>
          <ThemedText style={{ color: "#fff", fontWeight: '600' }}>
            Add Friend
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.activeTab]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                activeTab === tab && styles.activeTabLabel,
              ]}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getListData()}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item.id || item.username}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={loadData} 
            tintColor={DiscordColors.blurple}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>None here yet.</ThemedText>
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
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "rgba(78, 80, 88, 0.6)",
  },
  tabLabel: {
    fontSize: 16,
    color: DiscordColors.textSecondary,
    fontWeight: "500",
  },
  activeTabLabel: {
    color: "#ffffff",
    fontWeight: "700",
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
