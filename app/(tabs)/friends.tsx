import { FriendItem } from "@/components/FriendItem";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFriendStore } from "@/store/useFriendStore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

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
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Friends</ThemedText>
        <TouchableOpacity style={styles.addFriendBtn}>
          <ThemedText type="defaultSemiBold" style={{ color: "#fff" }}>
            Add Friend
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

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
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText>None here yet.</ThemedText>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addFriendBtn: {
    backgroundColor: "#5865F2",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#5865F2",
  },
  tabLabel: {
    fontSize: 16,
    color: "#888",
  },
  activeTabLabel: {
    color: "#5865F2",
    fontWeight: "bold",
  },
  listItem: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc",
    marginRight: 15,
  },
  itemContent: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    color: "#888",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  acceptButton: {
    backgroundColor: "#3BA55D",
  },
  rejectButton: {
    backgroundColor: "#ED4245",
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
});
