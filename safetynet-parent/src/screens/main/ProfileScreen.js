import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { childrenService } from '../../services';
import {
  getSettings,
  updateNotificationSettings,
  updateAppSettings,
} from '../../utils/settingsStorage';
import theme from '../../utils/theme';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { parent, logout, updateProfile } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications: {
      sosAlerts: true,
      geofenceAlerts: true,
      batteryAlerts: true,
      sound: true,
      vibration: true,
    },
    app: {
      theme: 'light',
      language: 'eng',
      mapType: 'standard',
    },
  });

  /**
   * Load profile data
   */
  const loadProfileData = async () => {
    try {
      setLoading(true);

      // Load children
      const childrenResponse = await childrenService.getChildren();
      if (childrenResponse.success) {
        setChildren(childrenResponse.data || []);
      }

      // Load settings
      const appSettings = await getSettings();
      setSettings(appSettings);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  /**
   * Handle edit profile
   */
  const handleEditProfile = () => {
    // Navigate to edit profile screen (to be created)
    Alert.alert('Edit Profile', 'Edit profile screen coming soon');
  };

  /**
   * Handle change password
   */
  const handleChangePassword = () => {
    // Navigate to change password screen (to be created)
    Alert.alert('Change Password', 'Change password screen coming soon');
  };

  /**
   * Handle notification setting toggle
   */
  const handleNotificationToggle = async (key, value) => {
    try {
      const updated = await updateNotificationSettings({ [key]: value });
      if (updated) {
        setSettings((prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [key]: value,
          },
        }));
      } else {
        Alert.alert('Error', 'Failed to update notification settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  /**
   * Handle app setting change
   */
  const handleAppSettingChange = async (key, value) => {
    try {
      const updated = await updateAppSettings({ [key]: value });
      if (updated) {
        setSettings((prev) => ({
          ...prev,
          app: {
            ...prev.app,
            [key]: value,
          },
        }));
      } else {
        Alert.alert('Error', 'Failed to update app settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update app settings');
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Get initials for avatar
   */
  const getInitials = (name) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  /**
   * Render setting row
   */
  const renderSettingRow = (icon, title, subtitle, value, onValueChange, showSwitch = true) => {
    return (
      <TouchableOpacity
        style={styles.settingRow}
        onPress={showSwitch ? undefined : onValueChange}
        activeOpacity={showSwitch ? 1 : 0.7}
      >
        <View style={styles.settingRowLeft}>
          <View style={styles.settingIcon}>
            <Icon name={icon} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {showSwitch ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.textWhite}
          />
        ) : (
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{value}</Text>
            <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render section header
   */
  const renderSectionHeader = (title) => {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
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

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {parent?.profile_image ? (
              <Image source={{ uri: parent.profile_image }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(parent?.name)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditProfile}>
              <Icon name="camera" size={16} color={theme.colors.textWhite} />
            </TouchableOpacity>
          </View>
          <Text style={styles.parentName}>{parent?.name || 'Parent'}</Text>
          <Text style={styles.parentEmail}>{parent?.email || ''}</Text>
          {parent?.phone && <Text style={styles.parentPhone}>📱 {parent.phone}</Text>}
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Icon name="pencil" size={18} color={theme.colors.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          {renderSectionHeader('Account Settings')}
          <View style={styles.sectionCard}>
            {renderSettingRow(
              'account-edit',
              'Edit Profile',
              'Update your personal information',
              null,
              handleEditProfile,
              false
            )}
            {renderSettingRow(
              'lock-reset',
              'Change Password',
              'Update your password',
              null,
              handleChangePassword,
              false
            )}
            {renderSettingRow(
              'phone',
              'Phone Number',
              parent?.phone || 'Not set',
              parent?.phone || 'Add Phone',
              () => handleEditProfile(),
              false
            )}
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          {renderSectionHeader('Notification Settings')}
          <View style={styles.sectionCard}>
            {renderSettingRow(
              'alert-circle',
              'SOS Alerts',
              'Get notified when child triggers SOS',
              settings.notifications.sosAlerts,
              (value) => handleNotificationToggle('sosAlerts', value)
            )}
            {renderSettingRow(
              'map-marker-radius',
              'Geofence Alerts',
              'Get notified on geofence enter/exit',
              settings.notifications.geofenceAlerts,
              (value) => handleNotificationToggle('geofenceAlerts', value)
            )}
            {renderSettingRow(
              'battery-alert',
              'Battery Alerts',
              'Get notified when battery is low',
              settings.notifications.batteryAlerts,
              (value) => handleNotificationToggle('batteryAlerts', value)
            )}
            {renderSettingRow(
              'volume-high',
              'Sound',
              'Play sound for notifications',
              settings.notifications.sound,
              (value) => handleNotificationToggle('sound', value)
            )}
            {renderSettingRow(
              'vibrate',
              'Vibration',
              'Vibrate for notifications',
              settings.notifications.vibration,
              (value) => handleNotificationToggle('vibration', value)
            )}
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          {renderSectionHeader('App Settings')}
          <View style={styles.sectionCard}>
            {renderSettingRow(
              'theme-light-dark',
              'Theme',
              'Light or Dark mode',
              settings.app.theme === 'light' ? 'Light' : 'Dark',
              () => {
                const newTheme = settings.app.theme === 'light' ? 'dark' : 'light';
                handleAppSettingChange('theme', newTheme);
              },
              false
            )}
            {renderSettingRow(
              'translate',
              'Language',
              'Choose your language',
              settings.app.language === 'eng' ? 'English' : 'বাংলা',
              () => {
                const newLang = settings.app.language === 'eng' ? 'ban' : 'eng';
                handleAppSettingChange('language', newLang);
              },
              false
            )}
            {renderSettingRow(
              'map',
              'Map Type',
              'Standard or Satellite view',
              settings.app.mapType === 'standard' ? 'Standard' : 'Satellite',
              () => {
                const newMapType =
                  settings.app.mapType === 'standard' ? 'satellite' : 'standard';
                handleAppSettingChange('mapType', newMapType);
              },
              false
            )}
          </View>
        </View>

        {/* Children Management */}
        <View style={styles.section}>
          {renderSectionHeader('My Children')}
          <View style={styles.sectionCard}>
            {children.length === 0 ? (
              <View style={styles.emptyChildren}>
                <Text style={styles.emptyChildrenText}>No children linked yet</Text>
                <TouchableOpacity
                  style={styles.addChildButton}
                  onPress={() => navigation.navigate('LinkChild')}
                >
                  <Icon name="account-plus" size={20} color={theme.colors.primary} />
                  <Text style={styles.addChildButtonText}>Add Child</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {children.map((child) => {
                  const childName = child.child?.full_name || child.child?.name || 'Unknown';
                  const childStatus = child.status || 'pending';
                  return (
                    <TouchableOpacity
                      key={child.child_id}
                      style={styles.childRow}
                      onPress={() => navigation.navigate('ChildDetail', { childId: child.child_id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.childRowLeft}>
                        <View style={styles.childAvatar}>
                          <Text style={styles.childAvatarText}>
                            {childName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .substring(0, 2)}
                          </Text>
                        </View>
                        <View style={styles.childInfo}>
                          <Text style={styles.childName}>{childName}</Text>
                          <Text style={styles.childStatus}>
                            {childStatus === 'active' ? '● Active' : '● Pending'}
                          </Text>
                        </View>
                      </View>
                      <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={styles.addChildButton}
                  onPress={() => navigation.navigate('LinkChild')}
                >
                  <Icon name="account-plus" size={20} color={theme.colors.primary} />
                  <Text style={styles.addChildButtonText}>Add Another Child</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={20} color={theme.colors.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: theme.spacing['5xl'],
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    ...theme.shadows.lg,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...theme.shadows.lg,
  },
  avatarText: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.md,
  },
  parentName: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  parentEmail: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  parentPhone: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#fff',
    ...theme.shadows.sm,
  },
  editButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
  },
  sectionHeaderText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  settingValueText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  emptyChildren: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyChildrenText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  addChildButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  addChildButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  childRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  childAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  childAvatarText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  childStatus: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.colors.error,
    ...theme.shadows.sm,
  },
  logoutButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.error,
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
});

export default ProfileScreen;
