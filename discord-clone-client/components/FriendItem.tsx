import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { UserAvatarWithActions } from "./UserAvatarWithActions";
import { UserRowNameplate } from "./UserRowNameplate";
import { ThemedText } from "./themed-text";
import { DiscordColors, Spacing } from "@/constants/theme";
import { DiscordButton } from "./DiscordButton";

export interface FriendItemProps {
  id: string | number;
  userId: string | number;
  username: string;
  displayName?: string;
  avatar?: string;
  statusText?: string;
  presenceStatus?: string;
  bio?: string;
  type: "ALL" | "PENDING" | "SENT";
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  index?: number;
  avatarEffectId?: string | null;
  bannerEffectId?: string | null;
  cardEffectId?: string | null;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  userId,
  username,
  displayName,
  avatar,
  statusText,
  presenceStatus,
  bio,
  type,
  onAccept,
  onReject,
  onCancel,
  index = 0,
  avatarEffectId,
  bannerEffectId,
  cardEffectId,
}) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.listItemContainer}
    >
      <UserRowNameplate cardEffectId={cardEffectId} style={styles.listItem}>
        <UserAvatarWithActions
          user={{
            id: userId,
            username,
            displayName,
            avatar,
            status: presenceStatus,
            bio,
            avatarEffectId,
            bannerEffectId,
            cardEffectId,
          }}
          size={44}
        />
        <View style={styles.itemContent}>
          <ThemedText style={styles.usernameText}>
            {displayName || username}
          </ThemedText>
          <ThemedText style={styles.statusText}>{statusText || `@${username}`}</ThemedText>
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
      </UserRowNameplate>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  listItemContainer: {
    borderRadius: 12,
    backgroundColor: DiscordColors.primaryBackground,
    overflow: 'hidden',
    marginHorizontal: Spacing.sm,
    marginVertical: 4,
  },
  listItem: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
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
