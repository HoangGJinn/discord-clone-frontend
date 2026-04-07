import { Avatar } from '@/components/Avatar';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useAuthStore } from '@/store/useAuthStore';
import { DiscordColors, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        <ThemedText style={styles.emptyText}>Please login to see your profile.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner} />
        
        <View style={styles.profileHeader}>
          <Avatar 
            name={user.username} 
            uri={user.avatar} 
            size={90} 
            status="ONLINE" 
            style={styles.avatarShift}
          />

          <View style={styles.nameContainer}>
            <ThemedText style={styles.displayName}>
              {user.displayName || user.username}
            </ThemedText>
            <ThemedText style={styles.username}>
              {user.username}
            </ThemedText>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>User Info</ThemedText>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Email</ThemedText>
              <ThemedText style={styles.infoValue}>{user.email}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>User ID</ThemedText>
              <ThemedText style={styles.infoValue}>{user.id}</ThemedText>
            </View>
          </View>

          <View style={styles.section}>
             <TouchableOpacity style={styles.editBtn}>
                <ThemedText style={styles.editBtnText}>Edit Profile</ThemedText>
             </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity 
               style={[styles.button, styles.logoutButton]} 
               onPress={handleLogout}
            >
              <ThemedText style={styles.buttonText}>Log Out</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DiscordColors.tertiaryBackground,
  },
  scrollContent: {
    flexGrow: 1,
  },
  banner: {
    height: 140,
    backgroundColor: DiscordColors.blurple,
  },
  profileHeader: {
    paddingHorizontal: Spacing.xl,
    marginTop: -45,
    marginBottom: Spacing.lg,
  },
  avatarShift: {
    marginBottom: Spacing.sm,
    borderWidth: 6,
    borderColor: DiscordColors.tertiaryBackground,
    borderRadius: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: DiscordColors.textPrimary,
    marginTop: 60,
    marginLeft: 20,
  },
  nameContainer: {
    marginTop: Spacing.xs,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: DiscordColors.textPrimary,
  },
  username: {
    fontSize: 15,
    color: DiscordColors.textSecondary,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: DiscordColors.primaryBackground,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
    overflow: 'hidden',
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    color: DiscordColors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DiscordColors.divider,
  },
  infoLabel: {
    color: DiscordColors.textMuted,
    fontSize: 14,
  },
  infoValue: {
    color: DiscordColors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  editBtn: {
    backgroundColor: DiscordColors.cardBackground,
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  editBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  button: {
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    backgroundColor: DiscordColors.red,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyText: {
    color: DiscordColors.textMuted,
    marginTop: 20,
    marginLeft: 20,
  },
});
