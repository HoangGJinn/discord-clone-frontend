import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar } from "./Avatar";
import { ThemedText } from "./themed-text";
import { DiscordColors, Spacing } from "@/constants/theme";
import { DiscordButton } from "./DiscordButton";

export interface FriendItemProps {
  id: string;
  username: string;
  avatar?: string;
  statusText?: string;
  type: "ALL" | "PENDING" | "SENT";
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  index?: number;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  username,
  avatar,
  statusText,
  type,
  onAccept,
  onReject,
  onCancel,
  index = 0,
}) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.listItem}
    >
      <Avatar name={username} uri={avatar} status="ONLINE" size={44} />
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
          <DiscordButton 
            title="Accept" 
            variant="success" 
            size="sm" 
            onPress={onAccept} 
          />
          <DiscordButton 
            title="Reject" 
            variant="danger" 
            size="sm" 
            onPress={onReject} 
          />
        </View>
      )}

      {type === "SENT" && (
        <DiscordButton 
          title="Cancel" 
          variant="danger" 
          size="sm" 
          onPress={onCancel} 
        />
      )}
    </Animated.View>
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
    fontWeight: "700",
    color: DiscordColors.textPrimary,
  },
  statusText: {
    fontSize: 13,
    color: DiscordColors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
});
