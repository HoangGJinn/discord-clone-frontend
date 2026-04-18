import React, { memo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { UserAvatarWithActions } from './UserAvatarWithActions';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import { SearchServer, SearchChannel, SearchMember } from '@/types/search';

// ─── Server Item ─────────────────────────────────────────────
interface ServerItemProps {
  server: SearchServer;
  onPress: () => void;
}

function SearchServerItemInner({ server, onPress }: ServerItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.serverIcon}>
        {server.icon ? (
          <Avatar name={server.name} uri={server.icon} size={40} />
        ) : (
          <View style={styles.serverInitial}>
            <ThemedText style={styles.initialText}>
              {server.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {server.name}
        </ThemedText>
        {server.memberCount !== undefined && (
          <ThemedText style={styles.subtitle}>
            {server.memberCount} members
          </ThemedText>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={DiscordColors.textMuted}
      />
    </TouchableOpacity>
  );
}

// ─── Channel Item ────────────────────────────────────────────
interface ChannelItemProps {
  channel: SearchChannel;
  onPress: () => void;
}

function SearchChannelItemInner({ channel, onPress }: ChannelItemProps) {
  const isVoiceChannel = channel.type === 'VOICE';

  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.channelIcon}>
        {isVoiceChannel ? (
          <Feather name="volume-2" size={20} color={DiscordColors.textMuted} />
        ) : (
          <ThemedText style={styles.channelHash}>#</ThemedText>
        )}
      </View>
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {channel.name}
        </ThemedText>
        {channel.serverName && (
          <ThemedText style={styles.subtitle}>
            in {channel.serverName}
          </ThemedText>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={DiscordColors.textMuted}
      />
    </TouchableOpacity>
  );
}

// ─── Member Item ─────────────────────────────────────────────
interface MemberItemProps {
  member: SearchMember;
  onPress: () => void;
}

function SearchMemberItemInner({ member, onPress }: MemberItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.6}>
      <UserAvatarWithActions
        user={{
          id: member.id,
          username: member.username,
          displayName: member.displayName,
          avatar: member.avatar,
          status: member.status,
        }}
        size={40}
      />
      <View style={[styles.info, { marginLeft: Spacing.md }]}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {member.displayName || member.username}
        </ThemedText>
        <ThemedText style={styles.subtitle}>@{member.username}</ThemedText>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={DiscordColors.textMuted}
      />
    </TouchableOpacity>
  );
}

export const SearchServerItem = memo(SearchServerItemInner);
export const SearchChannelItem = memo(SearchChannelItemInner);
export const SearchMemberItem = memo(SearchMemberItemInner);

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DiscordColors.divider,
  },
  serverIcon: {
    width: 40,
    height: 40,
    marginRight: Spacing.md,
  },
  serverInitial: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DiscordColors.tertiaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  channelHash: {
    color: DiscordColors.textMuted,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: DiscordColors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: DiscordColors.textMuted,
    marginTop: 1,
  },
});
