import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar } from "./Avatar";
import { ThemedText } from "./themed-text";

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
      <Avatar name={username} uri={avatar} status="ONLINE" size={40} />
      <View style={styles.itemContent}>
        <ThemedText type="defaultSemiBold">{username}</ThemedText>
        <ThemedText type="default" style={styles.statusText}>
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
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  itemContent: {
    flex: 1,
    marginLeft: 15,
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
});
