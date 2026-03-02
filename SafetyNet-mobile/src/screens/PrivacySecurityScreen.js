import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../utils/theme';
import settingsService from '../services/settingsService';

/**
 * PrivacySecurityScreen
 * Manage privacy and security settings
 */
function PrivacySecurityScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    shareAnalytics: false,
    crashReports: true,
    dataEncryption: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    hidePersonalInfo: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const privacySettings = await settingsService.getSettingCategory('privacy');
      setSettings(privacySettings);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      Alert.alert('Error', 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    const updatedSettings = { ...settings, [key]: newValue };
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await settingsService.updateSettings('privacy', updatedSettings);
    } catch (error) {
      console.error('Error saving setting:', error);
      setSettings(settings);
      Alert.alert('Error', 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  const handleSessionTimeoutChange = () => {
    Alert.alert(
      'Session Timeout',
      'Select session timeout duration',
      [
        { text: '15 minutes', onPress: () => updateSetting('sessionTimeout', 15) },
        { text: '30 minutes', onPress: () => updateSetting('sessionTimeout', 30) },
        { text: '1 hour', onPress: () => updateSetting('sessionTimeout', 60) },
        { text: '2 hours', onPress: () => updateSetting('sessionTimeout', 120) },
        { text: 'Never', onPress: () => updateSetting('sessionTimeout', 0) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateSetting = async (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    await settingsService.updateSettings('privacy', updatedSettings);
  };

  const enableTwoFactorAuth = () => {
    Alert.alert(
      'Two-Factor Authentication',
      'Two-factor authentication adds an extra layer of security to your account. You will need to verify your identity using a second method when logging in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            // In a real app, you'd set up 2FA here
            Alert.alert('Success', 'Two-factor authentication enabled');
            await updateSetting('twoFactorAuth', true);
          },
        },
      ]
    );
  };

  const viewPrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Privacy policy would open here in a real app');
  };

  const viewDataPolicy = () => {
    Alert.alert('Data Policy', 'Data policy would open here in a real app');
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Account deletion would be processed here');
          },
        },
      ]
    );
  };

  const renderSettingRow = (icon, title, description, value, onToggle, disabled = false) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled || saving}
        trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
        thumbColor={value ? theme.colors.primary : theme.colors.border}
      />
    </View>
  );

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
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Data Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Privacy</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'analytics',
              'Share Analytics',
              'Help improve the app by sharing anonymous usage data',
              settings.shareAnalytics,
              () => handleToggle('shareAnalytics')
            )}
            {renderSettingRow(
              'bug',
              'Crash Reports',
              'Automatically send crash reports to help fix issues',
              settings.crashReports,
              () => handleToggle('crashReports')
            )}
            {renderSettingRow(
              'lock-closed',
              'Data Encryption',
              'Encrypt all data stored on your device',
              settings.dataEncryption,
              () => handleToggle('dataEncryption')
            )}
            {renderSettingRow(
              'eye-off',
              'Hide Personal Info',
              'Hide personal information in screenshots and app switcher',
              settings.hidePersonalInfo,
              () => handleToggle('hidePersonalInfo')
            )}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.securityButton}
              onPress={settings.twoFactorAuth ? () => handleToggle('twoFactorAuth') : enableTwoFactorAuth}
              activeOpacity={0.7}
            >
              <View style={styles.securityButtonLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                  <Text style={styles.settingDescription}>
                    {settings.twoFactorAuth
                      ? 'Enabled - Tap to disable'
                      : 'Add an extra layer of security'}
                  </Text>
                </View>
              </View>
              {settings.twoFactorAuth ? (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeoutButton}
              onPress={handleSessionTimeoutChange}
              activeOpacity={0.7}
            >
              <View style={styles.timeoutButtonLeft}>
                <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Session Timeout</Text>
                  <Text style={styles.settingDescription}>
                    {settings.sessionTimeout === 0
                      ? 'Never'
                      : `${settings.sessionTimeout} minutes`}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Policies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Policies</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.policyButton}
              onPress={viewPrivacyPolicy}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text" size={24} color={theme.colors.primary} />
              <Text style={styles.policyButtonText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.policyButton}
              onPress={viewDataPolicy}
              activeOpacity={0.7}
            >
              <Ionicons name="server" size={24} color={theme.colors.primary} />
              <Text style={styles.policyButtonText}>Data Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={deleteAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
              <Text style={styles.dangerButtonText}>Delete Account</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
          <Text style={styles.infoText}>
            Your data is encrypted and stored securely. We never share your personal information
            with third parties without your consent.
          </Text>
        </View>
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  securityButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  timeoutButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  policyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  policyButtonText: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  dangerButtonText: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
    lineHeight: 20,
  },
});

export default PrivacySecurityScreen;

