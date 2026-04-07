import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar } from "./Avatar";
import { ThemedText } from "./themed-text";
import { DiscordColors, Spacing } from "@/constants/theme";

export interface FriendItemProps {
  id: string;
  username: string;
  avatar?: string;
  statusText?: string;
  type: "ALL" | "PENDING" | "SENT";
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  username,
  avatar,
  statusText,
  type,
  onAccept,
  onReject,
  onCancel,
}) => {
  return (
    <View style={styles.listItem}>
      <Avatar name={username} uri={avatar} status="ONLINE" size={42} />
      <View style={styles.itemContent}>
        <ThemedText style={styles.usernameText}>
          {username}
        </ThemedText>
        <ThemedText style={styles.statusText}>
          {statusText || "Online"}
        </ThemedText>
      </View>

      {type === "PENDING" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={onAccept}
          >
            <ThemedText style={styles.buttonText}>Accept</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={onReject}
          >
            <ThemedText style={styles.buttonText}>Reject</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {type === "SENT" && (
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={onCancel}
        >
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listItem: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    backgroundColor: DiscordColors.primaryBackground,
  },
  itemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: "600",
    color: DiscordColors.textPrimary,
  },
  statusText: {
    fontSize: 13,
    color: DiscordColors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: "center",
  },
  acceptButton: {
    backgroundColor: DiscordColors.green,
  },
  rejectButton: {
    backgroundColor: DiscordColors.red,
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
