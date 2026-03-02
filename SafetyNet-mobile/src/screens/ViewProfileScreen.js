import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import theme from '../utils/theme';

/**
 * ViewProfileScreen
 * Displays user profile information in a read-only format
 */
function ViewProfileScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  // Refresh profile when screen comes into focus (e.g., after editing)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const result = await profileService.getProfile();
      if (result.success) {
        // Ensure email is synced from AuthContext
        const profileData = {
          ...result.data,
          email: user?.email || result.data.email,
        };
        setProfile(profileData);
      } else {
        Alert.alert('Error', result.message || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderProfileField = (icon, label, value, optional = false) => {
    if (optional && !value) return null;

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldIconContainer}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.fieldContent}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldValue}>{value || 'Not set'}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.avatarContainer}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
              </View>
            )}
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          <View style={styles.cardContent}>
            {renderProfileField('mail-outline', 'Email', profile.email)}
            {renderProfileField('call-outline', 'Phone', profile.phone)}
            {renderProfileField('calendar-outline', 'Date of Birth', formatDate(profile.dob))}
            {renderProfileField('water-outline', 'Blood Group', profile.bloodGroup, true)}
            {renderProfileField('location-outline', 'Address', profile.address, true)}
          </View>
        </View>

        {/* Account Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Account Status</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons
                  name={profile.isVerified ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={profile.isVerified ? theme.colors.success : theme.colors.error}
                />
                <Text style={styles.statusLabel}>Verification Status</Text>
              </View>
              <Text
                style={[
                  styles.statusValue,
                  { color: profile.isVerified ? theme.colors.success : theme.colors.error },
                ]}
              >
                {profile.isVerified ? 'Verified' : 'Not Verified'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons
                  name={profile.emergencyReady ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={profile.emergencyReady ? theme.colors.success : theme.colors.warning}
                />
                <Text style={styles.statusLabel}>Emergency Readiness</Text>
              </View>
              <Text
                style={[
                  styles.statusValue,
                  {
                    color: profile.emergencyReady
                      ? theme.colors.success
                      : theme.colors.warning,
                  },
                ]}
              >
                {profile.emergencyReady ? 'Ready' : 'Not Ready'}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color={theme.colors.textWhite} />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
  retryButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['2xl'],
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderRadius: 15,
  },
  profileName: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
  },
  cardContent: {
    paddingTop: theme.spacing.sm,
  },
  fieldContainer: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  fieldIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  fieldContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  fieldLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  fieldValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
  },
  statusValue: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  editButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    marginLeft: theme.spacing.sm,
  },
});

export default ViewProfileScreen;

