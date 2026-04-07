import { Avatar } from '@/components/Avatar';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/store/useAuthStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText>Please login to see your profile.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.banner} />
        
        <View style={styles.profileHeader}>
          <Avatar 
            name={user.username} 
            uri={user.avatar} 
            size={80} 
            status="ONLINE" 
            style={styles.avatarShift}
          />

          <View style={styles.nameContainer}>
            <ThemedText type="title" style={styles.displayName}>
              {user.displayName || user.username}
            </ThemedText>
            <ThemedText type="default" style={styles.username}>
              {user.username}
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>User Info</ThemedText>
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
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  banner: {
    height: 120,
    backgroundColor: '#5865F2',
  },
  profileHeader: {
    paddingHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
  },
  avatarShift: {
    marginBottom: 10,
    borderWidth: 4,
    borderColor: '#1E1F22',
    borderRadius: 45,
  },
  nameContainer: {
    gap: 2,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#ccc',
  },
  infoValue: {
    color: '#fff',
  },
  editBtn: {
    backgroundColor: '#4E5058',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: '#ED4245',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
