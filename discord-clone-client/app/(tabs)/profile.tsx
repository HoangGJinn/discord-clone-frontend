import { Avatar } from '@/components/Avatar';
import { StatusSelector, UserStatus } from '@/components/StatusSelector';
import apiClient from '@/api/client';
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  RefreshControl 
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { useAuthStore } from '@/store/useAuthStore';
import { DiscordColors, Spacing } from '@/constants/theme';
import { DiscordButton } from '@/components/DiscordButton';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleStatusChange = async (status: UserStatus) => {
    try {
      await apiClient.put('/users/me/status', { status });
      updateUser({ status });
      Alert.alert('Success', 'Status updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getAvatarColor = (name: string) => {
    const colors = [
      '#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245',
      '#3BA55C', '#FAA61A', '#9B84EE', '#F47FFF', '#00D4AA',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
         <ThemedText style={styles.emptyText}>Please login to see your profile.</ThemedText>
      </View>
    );
  }

  const avatarColor = getAvatarColor(user.username);
  const isPremium = user.role?.includes('ROLE_PREMIUM');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={DiscordColors.textSecondary}
          />
        }
      >
        {/* Banner with Dynamic Color */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.banner}>
           <View style={[styles.bannerOverlay, { backgroundColor: avatarColor }]} />
        </Animated.View>
        
        <View style={styles.profileHeader}>
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Avatar 
                name={user.username} 
                uri={user.avatar} 
                size={100} 
                status={user.status as any || 'ONLINE'}
                style={styles.avatarShift}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.nameSection}>
            <View style={styles.titleRow}>
               <ThemedText style={styles.displayName}>
                 {user.displayName || user.username}
               </ThemedText>
               <TouchableOpacity style={styles.editCircleBtn}>
                  <Ionicons name="pencil" size={16} color={DiscordColors.textPrimary} />
               </TouchableOpacity>
            </View>
            <ThemedText style={styles.username}>
              @{user.username}
            </ThemedText>
            {isPremium && (
               <View style={styles.premiumBadge}>
                  <ThemedText style={styles.premiumText}>USER_PREMIUM</ThemedText>
               </View>
            )}
          </Animated.View>
        </View>

        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.card}
        >
          {/* Status Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>STATUS</ThemedText>
            <StatusSelector
              currentStatus={user.status as UserStatus}
              onSelectStatus={handleStatusChange}
            />
          </View>

          <View style={styles.divider} />

          {/* Bio Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>ABOUT ME</ThemedText>
            <ThemedText style={styles.bioText}>
              {user.bio || "No bio yet. Tap edit to add one!"}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          {/* Account Info Section */}
          <View style={styles.section}>
             <ThemedText style={styles.sectionTitle}>ACCOUNT INFORMATION</ThemedText>
             
             <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={20} color={DiscordColors.textSecondary} />
                <View style={styles.infoContent}>
                   <ThemedText style={styles.infoLabel}>Email</ThemedText>
                   <ThemedText style={styles.infoValue}>{user.email}</ThemedText>
                </View>
             </View>

             <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={20} color={DiscordColors.textSecondary} />
                <View style={styles.infoContent}>
                   <ThemedText style={styles.infoLabel}>User ID</ThemedText>
                   <ThemedText style={styles.infoValue}>{user.id}</ThemedText>
                </View>
             </View>
          </View>

          <View style={styles.divider} />

          {/* Actions Section */}
          <View style={styles.section}>
             <TouchableOpacity style={styles.actionRow}>
                <Ionicons name="key-outline" size={20} color={DiscordColors.textSecondary} />
                <ThemedText style={styles.actionText}>Change Password</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>

             <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/friends')}>
                <Ionicons name="people-outline" size={20} color={DiscordColors.textSecondary} />
                <ThemedText style={styles.actionText}>Friends</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>

             <TouchableOpacity style={styles.actionRow}>
                <Ionicons name="diamond-outline" size={20} color={DiscordColors.textSecondary} />
                <ThemedText style={styles.actionText}>Get Premium</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={DiscordColors.textMuted} />
             </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.footer}>
           <DiscordButton 
              title="Log Out" 
              variant="danger" 
              onPress={handleLogout}
              style={styles.logoutBtn}
           />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.secondaryBackground,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  banner: {
    height: 120,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  profileHeader: {
    paddingHorizontal: Spacing.lg,
    marginTop: -50,
  },
  avatarShift: {
    borderWidth: 6,
    borderColor: DiscordColors.secondaryBackground,
    borderRadius: 55,
  },
  nameSection: {
    marginTop: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '800',
    color: DiscordColors.textPrimary,
  },
  username: {
    fontSize: 15,
    color: DiscordColors.textSecondary,
    marginTop: 2,
  },
  editCircleBtn: {
    backgroundColor: DiscordColors.tertiaryBackground,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    backgroundColor: '#3A2D10',
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  premiumText: {
    color: '#FEE75C',
    fontSize: 10,
    fontWeight: '800',
  },
  card: {
    backgroundColor: DiscordColors.tertiaryBackground,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    borderRadius: 12,
    overflow: 'hidden',
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: DiscordColors.textSecondary,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  bioText: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: DiscordColors.divider,
    marginHorizontal: Spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoContent: {
    marginLeft: Spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    color: DiscordColors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 14,
    color: DiscordColors.textPrimary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  actionText: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: 15,
    color: DiscordColors.textPrimary,
  },
  footer: {
    padding: Spacing.xl,
    marginTop: Spacing.lg,
  },
  logoutBtn: {
    borderRadius: 8,
  },
  emptyText: {
    color: DiscordColors.textMuted,
  },
});
