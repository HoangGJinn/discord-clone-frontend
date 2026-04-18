import { DiscordButton } from "@/components/DiscordButton";
import { UserAvatarWithActions } from "@/components/UserAvatarWithActions";
import { ThemedText } from "@/components/themed-text";
import { DiscordColors, Spacing } from "@/constants/theme";
import { UserSearchResult, useFriendStore } from "@/store/useFriendStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const normalizeName = (item: UserSearchResult) => item.displayName || item.username;

export default function AddFriendScreen() {
  const router = useRouter();
  const {
    searchResults,
    isSearching,
    isLoading,
    error,
    searchUsers,
    clearSearchResults,
    clearError,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    fetchFriends,
    fetchReceivedRequests,
    fetchSentRequests,
  } = useFriendStore();

  const [query, setQuery] = useState("");
  const [actingUserId, setActingUserId] = useState<number | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      clearSearchResults();
      return;
    }

    const timeout = setTimeout(() => {
      void searchUsers(trimmed);
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, searchUsers, clearSearchResults]);

  const refreshAfterMutation = async () => {
    await Promise.all([fetchFriends(), fetchReceivedRequests(), fetchSentRequests()]);
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      await searchUsers(trimmed);
    }
  };

  const executeAction = async (targetId: number, runner: () => Promise<void>, errorTitle: string) => {
    setActingUserId(targetId);
    clearError();
    try {
      await runner();
      await refreshAfterMutation();
    } catch (err) {
      Alert.alert(errorTitle, err instanceof Error ? err.message : "Request failed");
    } finally {
      setActingUserId(null);
    }
  };

  const renderActions = (item: UserSearchResult) => {
    const status = item.friendshipStatus;
    const friendshipId = item.friendshipId ?? undefined;
    const isActing = actingUserId === item.id;

    if (!status || status === "REJECTED") {
      return (
        <DiscordButton
          title={isActing ? "Adding..." : "Add Friend"}
          variant="success"
          size="sm"
          onPress={() =>
            void executeAction(
              item.id,
              () => sendFriendRequest(item.id),
              "Cannot send friend request",
            )
          }
          style={styles.actionBtn}
        />
      );
    }

    if (status === "ACCEPTED") {
      return (
        <View style={[styles.tagBox, styles.tagFriend]}>
          <ThemedText style={styles.tagText}>Friends</ThemedText>
        </View>
      );
    }

    if (status === "BLOCKED") {
      return (
        <View style={[styles.tagBox, styles.tagBlocked]}>
          <ThemedText style={styles.tagText}>Blocked</ThemedText>
        </View>
      );
    }

    if (status === "PENDING" && item.isSender && friendshipId) {
      return (
        <DiscordButton
          title={isActing ? "Cancelling..." : "Cancel Request"}
          variant="danger"
          size="sm"
          onPress={() =>
            void executeAction(
              item.id,
              () => cancelFriendRequest(friendshipId),
              "Cannot cancel request",
            )
          }
          style={styles.actionBtn}
        />
      );
    }

    if (status === "PENDING" && !item.isSender && friendshipId) {
      return (
        <View style={styles.pendingActions}>
          <DiscordButton
            title="Accept"
            variant="success"
            size="sm"
            onPress={() =>
              void executeAction(
                item.id,
                () => acceptFriendRequest(friendshipId),
                "Cannot accept request",
              )
            }
            style={styles.actionBtn}
          />
          <DiscordButton
            title="Reject"
            variant="danger"
            size="sm"
            onPress={() =>
              void executeAction(
                item.id,
                () => rejectFriendRequest(friendshipId),
                "Cannot reject request",
              )
            }
            style={styles.actionBtn}
          />
        </View>
      );
    }

    return null;
  };

  const results = useMemo(() => searchResults, [searchResults]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={DiscordColors.textSecondary} />
          <ThemedText style={styles.backText}>Back</ThemedText>
        </TouchableOpacity>
        <ThemedText style={styles.title}>Add Friend</ThemedText>
        <ThemedText style={styles.subtitle}>Search by username</ThemedText>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={DiscordColors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Type username..."
          placeholderTextColor={DiscordColors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={DiscordColors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {isSearching && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={DiscordColors.blurple} />
          <ThemedText style={styles.loadingText}>Searching users...</ThemedText>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <ThemedText style={styles.emptyTitle}>
              {query.trim().length < 2 ? "Enter at least 2 characters" : "No users found"}
            </ThemedText>
            <ThemedText style={styles.emptySub}>
              {query.trim().length < 2
                ? "Start typing a username to search."
                : "Try another username."}
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.resultItem}>
            <View style={styles.userInfo}>
              <UserAvatarWithActions
                user={{
                  id: item.id,
                  username: item.username,
                  displayName: item.displayName,
                  avatar: item.avatarUrl || undefined,
                  bio: item.bio,
                }}
                size={44}
                status="OFFLINE"
              />
              <View style={styles.nameBox}>
                <ThemedText style={styles.displayName}>{normalizeName(item)}</ThemedText>
                <ThemedText style={styles.username}>@{item.username}</ThemedText>
              </View>
            </View>

            <View style={styles.actionsBox}>
              {isLoading && actingUserId === item.id ? (
                <ActivityIndicator size="small" color={DiscordColors.blurple} />
              ) : (
                renderActions(item)
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  backText: {
    color: DiscordColors.textSecondary,
    fontSize: 15,
    marginLeft: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: DiscordColors.textPrimary,
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: DiscordColors.textSecondary,
    fontSize: 14,
  },
  searchBar: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DiscordColors.divider,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: DiscordColors.textPrimary,
    fontSize: 15,
    paddingVertical: 10,
  },
  errorBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  loadingBox: {
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  loadingText: {
    color: DiscordColors.textSecondary,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 120,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DiscordColors.textPrimary,
  },
  emptySub: {
    marginTop: Spacing.xs,
    color: DiscordColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DiscordColors.divider,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: Spacing.sm,
  },
  nameBox: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  displayName: {
    color: DiscordColors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  username: {
    color: DiscordColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  actionsBox: {
    minWidth: 120,
    alignItems: "flex-end",
  },
  actionBtn: {
    minWidth: 96,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 8,
  },
  tagBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagFriend: {
    backgroundColor: "rgba(35,165,89,0.2)",
  },
  tagBlocked: {
    backgroundColor: "rgba(237,66,69,0.2)",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: DiscordColors.textSecondary,
  },
});
