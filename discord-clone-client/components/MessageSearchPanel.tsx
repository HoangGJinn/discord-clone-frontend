import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ThemedText } from './themed-text';
import { DiscordColors, Spacing } from '@/constants/theme';
import {
  MessageSearchResult,
  searchChannelMessages,
  searchDmMessages,
} from '@/services/messageSearchService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Utility ─────────────────────────────────────────────────
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ` at ${timeStr}`;
}

// ─── Highlight matched keyword in text ───────────────────────
function HighlightText({ text, keyword, style }: { text: string; keyword: string; style?: any }) {
  if (!keyword.trim()) return <ThemedText style={style}>{text}</ThemedText>;

  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <ThemedText style={style}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <ThemedText key={i} style={[style, styles.highlight]}>{part}</ThemedText>
        ) : (
          <ThemedText key={i} style={style}>{part}</ThemedText>
        )
      )}
    </ThemedText>
  );
}

// ─── Single result item ───────────────────────────────────────
const SearchResultItem = memo(function SearchResultItem({
  item,
  keyword,
  onPress,
}: {
  item: MessageSearchResult;
  keyword: string;
  onPress: (item: MessageSearchResult) => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(item)}
        style={styles.resultItem}
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          {item.senderAvatar ? (
            <Image
              source={{ uri: item.senderAvatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <ThemedText style={styles.avatarInitial}>
                {(item.senderName || '?').charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.resultContent}>
          <View style={styles.resultMeta}>
            <ThemedText style={styles.senderName} numberOfLines={1}>
              {item.senderName}
            </ThemedText>
            <ThemedText style={styles.dateText}>
              {formatDateTime(item.createdAt)}
            </ThemedText>
          </View>
          <HighlightText
            text={item.content}
            keyword={keyword}
            style={styles.messagePreview}
          />
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={14} color={DiscordColors.textMuted} />
      </Pressable>
    </Animated.View>
  );
});

// ─── Main Component ───────────────────────────────────────────
interface MessageSearchPanelProps {
  visible: boolean;
  mode: 'dm' | 'channel';
  conversationId?: string;
  channelId?: string | number;
  onClose: () => void;
  onSelectResult: (messageId: string) => void;
}

export const MessageSearchPanel = memo(function MessageSearchPanel({
  visible,
  mode,
  conversationId,
  channelId,
  onClose,
  onSelectResult,
}: MessageSearchPanelProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Slide animation ──────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start(() => inputRef.current?.focus());
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ── Debounced search ─────────────────────────────────────
  const doSearch = useCallback(
    async (kw: string) => {
      if (!kw.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      setIsLoading(true);
      setHasSearched(true);
      try {
        let data: MessageSearchResult[] = [];
        if (mode === 'dm' && conversationId) {
          data = await searchDmMessages(conversationId, kw.trim());
        } else if (mode === 'channel' && channelId) {
          data = await searchChannelMessages(channelId, kw.trim());
        }
        setResults(data);
      } catch (err) {
        console.error('[MessageSearch] Error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [mode, conversationId, channelId],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      setKeyword(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(text), 400);
    },
    [doSearch],
  );

  const handleClose = useCallback(() => {
    setKeyword('');
    setResults([]);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: MessageSearchResult) => {
      onSelectResult(item.id);
    },
    [onSelectResult],
  );

  const renderItem = useCallback(
    ({ item }: { item: MessageSearchResult }) => (
      <SearchResultItem item={item} keyword={keyword} onPress={handleSelect} />
    ),
    [keyword, handleSelect],
  );

  const keyExtractor = useCallback((item: MessageSearchResult) => item.id, []);

  if (!visible && slideAnim.__getValue() >= SCREEN_WIDTH) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
      {/* Search Header — với padding top đủ để tránh thanh pin/thời gian */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={DiscordColors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="search"
            size={16}
            color={DiscordColors.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search messages..."
            placeholderTextColor={DiscordColors.textMuted}
            value={keyword}
            onChangeText={handleChangeText}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {keyword.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => handleChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={DiscordColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={DiscordColors.blurple} size="large" />
          <ThemedText style={styles.statusText}>Searching...</ThemedText>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={40} color={DiscordColors.textMuted} />
          </View>
          <ThemedText style={styles.emptyTitle}>No results found</ThemedText>
          <ThemedText style={styles.statusText}>
            No messages match "{keyword}"
          </ThemedText>
        </View>
      ) : results.length > 0 ? (
        <>
          <View style={styles.countBar}>
            <ThemedText style={styles.countText}>
              {results.length} result{results.length !== 1 ? 's' : ''}{results.length >= 50 ? ' (max)' : ''}
            </ThemedText>
          </View>
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <View style={styles.centerBox}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={44} color={DiscordColors.textMuted} />
          </View>
          <ThemedText style={styles.emptyTitle}>Search Messages</ThemedText>
          <ThemedText style={styles.statusText}>
            Type a keyword to search for messages
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DiscordColors.primaryBackground,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    // paddingTop bị override bởi insets.top động trong JSX
    backgroundColor: DiscordColors.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
    gap: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DiscordColors.tertiaryBackground,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    height: 40,
    gap: 6,
  },
  inputIcon: {
    marginLeft: 2,
  },
  input: {
    flex: 1,
    color: DiscordColors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  countBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: DiscordColors.secondaryBackground,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  countText: {
    fontSize: 12,
    color: DiscordColors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingVertical: Spacing.xs,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: DiscordColors.blurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  resultContent: {
    flex: 1,
    gap: 3,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    color: DiscordColors.textPrimary,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 11,
    color: DiscordColors.textMuted,
  },
  messagePreview: {
    fontSize: 14,
    color: DiscordColors.textSecondary,
    lineHeight: 19,
  },
  highlight: {
    backgroundColor: 'rgba(88,101,242,0.25)',
    color: DiscordColors.blurple,
    fontWeight: '700',
    borderRadius: 3,
  },
  separator: {
    height: 1,
    backgroundColor: DiscordColors.divider,
    marginHorizontal: Spacing.md,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DiscordColors.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
  },
  statusText: {
    fontSize: 14,
    color: DiscordColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
