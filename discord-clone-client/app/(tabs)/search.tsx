import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import {
  SearchServerItem,
  SearchChannelItem,
  SearchMemberItem,
} from '@/components/SearchResultItem';
import { useSearchStore } from '@/store/useSearchStore';
import { SearchType } from '@/types/search';
import { DiscordColors, Spacing } from '@/constants/theme';

// ─── Tab Filter ──────────────────────────────────────────────
const TABS: { key: SearchType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'servers', label: 'Servers' },
  { key: 'channels', label: 'Channels' },
  { key: 'members', label: 'Members' },
  { key: 'friends', label: 'Friends' },
];

// ─── Screen ──────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    query,
    searchType,
    results,
    isSearching,
    setQuery,
    setSearchType,
    search,
    clearResults,
  } = useSearchStore();

  const [localQuery, setLocalQuery] = useState(query);

  // Debounced search
  const handleChangeText = useCallback(
    (text: string) => {
      setLocalQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        setQuery(text);
        if (text.trim()) {
          search(text.trim());
        } else {
          clearResults();
        }
      }, 400);
    },
    [search, setQuery, clearResults],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Handle tab change
  const handleTabChange = useCallback(
    (type: SearchType) => {
      setSearchType(type);
    },
    [setSearchType],
  );

  // ── Count total results ────────────────────────────────
  const totalResults =
    results.servers.length + results.channels.length + results.members.length + results.friends.length;

  const hasQuery = localQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={DiscordColors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={localQuery}
            onChangeText={handleChangeText}
            placeholder="Search servers, channels, people, friends..."
            placeholderTextColor={DiscordColors.textMuted}
            returnKeyType="search"
            autoFocus={false}
          />
          {hasQuery && (
            <TouchableOpacity
              onPress={() => {
                setLocalQuery('');
                setQuery('');
                clearResults();
              }}
              style={styles.clearBtn}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={DiscordColors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              searchType === tab.key && styles.tabActive,
            ]}
            onPress={() => handleTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.tabText,
                searchType === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading */}
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={DiscordColors.blurple} size="large" />
        </View>
      )}

      {/* Results */}
      {!isSearching && hasQuery && (
        <ScrollView
          style={styles.results}
          showsVerticalScrollIndicator={false}
        >
          {/* Servers */}
          {(searchType === 'all' || searchType === 'servers') &&
            results.servers.length > 0 && (
              <Animated.View entering={FadeInDown.delay(100).duration(300)}>
                <ThemedText style={styles.sectionTitle}>
                  Servers ({results.servers.length})
                </ThemedText>
                {results.servers.map((server) => (
                  <SearchServerItem
                    key={server.id}
                    server={server}
                    onPress={() => {
                      // Navigate to server detail (handled by Dev 1)
                      alert(`Navigate to server: ${server.name}`);
                    }}
                  />
                ))}
              </Animated.View>
            )}

          {/* Channels */}
          {(searchType === 'all' || searchType === 'channels') &&
            results.channels.length > 0 && (
              <Animated.View entering={FadeInDown.delay(200).duration(300)}>
                <ThemedText style={styles.sectionTitle}>
                  Channels ({results.channels.length})
                </ThemedText>
                {results.channels.map((channel) => (
                  <SearchChannelItem
                    key={channel.id}
                    channel={channel}
                    onPress={() => {
                      router.push(`/channel/${channel.id}` as any);
                    }}
                  />
                ))}
              </Animated.View>
            )}

          {/* Members */}
          {(searchType === 'all' || searchType === 'members') &&
            results.members.length > 0 && (
              <Animated.View entering={FadeInDown.delay(300).duration(300)}>
                <ThemedText style={styles.sectionTitle}>
                  Members ({results.members.length})
                </ThemedText>
                {results.members.map((member) => (
                  <SearchMemberItem
                    key={member.id}
                    member={member}
                    onPress={() => {
                      // Navigate to user profile
                      alert(`View profile: ${member.username}`);
                    }}
                  />
                ))}
              </Animated.View>
            )}

          {/* Friends */}
          {(searchType === 'all' || searchType === 'friends') &&
            results.friends.length > 0 && (
              <Animated.View entering={FadeInDown.delay(400).duration(300)}>
                <ThemedText style={styles.sectionTitle}>
                  Friends ({results.friends.length})
                </ThemedText>
                {results.friends.map((friend) => (
                  <SearchMemberItem
                    key={friend.id}
                    member={friend}
                    onPress={() => {
                      // Navigate to friend profile
                      alert(`View profile: ${friend.username}`);
                    }}
                  />
                ))}
              </Animated.View>
            )}

          {/* No results */}
          {totalResults === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color={DiscordColors.textMuted}
              />
              <ThemedText style={styles.emptyTitle}>
                No results found
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Try searching with different keywords
              </ThemedText>
            </View>
          )}
        </ScrollView>
      )}

      {/* Initial State (No query) */}
      {!hasQuery && !isSearching && (
        <View style={styles.initialContainer}>
          <Ionicons
            name="compass-outline"
            size={64}
            color={DiscordColors.textMuted}
          />
          <ThemedText style={styles.initialTitle}>Explore</ThemedText>
          <ThemedText style={styles.initialSubtitle}>
            Search for servers, channels, people, and friends
          </ThemedText>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.primaryBackground,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: DiscordColors.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.inputBackground,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: DiscordColors.textPrimary,
  },
  clearBtn: {
    padding: 4,
  },
  tabBar: {
    backgroundColor: DiscordColors.secondaryBackground,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  tabActive: {
    backgroundColor: DiscordColors.blurple,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: DiscordColors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  results: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DiscordColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DiscordColors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DiscordColors.textMuted,
    marginTop: Spacing.xs,
  },
  initialContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
    marginTop: Spacing.md,
  },
  initialSubtitle: {
    fontSize: 14,
    color: DiscordColors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
