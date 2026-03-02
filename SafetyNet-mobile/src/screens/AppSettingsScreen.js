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
 * AppSettingsScreen
 * Manage general app settings
 */
function AppSettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    biometricAuth: false,
    autoLock: false,
    autoLockTimeout: 5,
    dataUsage: 'standard',
    cacheEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const appSettings = await settingsService.getSettingCategory('app');
      setSettings(appSettings);
    } catch (error) {
      console.error('Error loading app settings:', error);
      Alert.alert('Error', 'Failed to load app settings');
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
      await settingsService.updateSettings('app', updatedSettings);
    } catch (error) {
      console.error('Error saving setting:', error);
      setSettings(settings);
      Alert.alert('Error', 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (theme) => {
    const updatedSettings = { ...settings, theme };
    setSettings(updatedSettings);
    settingsService.updateSettings('app', updatedSettings);
  };

  const handleLanguageChange = (language) => {
    const updatedSettings = { ...settings, language };
    setSettings(updatedSettings);
    settingsService.updateSettings('app', updatedSettings);
    Alert.alert('Language Changed', 'Please restart the app for changes to take effect.');
  };

  const handleDataUsageChange = (dataUsage) => {
    const updatedSettings = { ...settings, dataUsage };
    setSettings(updatedSettings);
    settingsService.updateSettings('app', updatedSettings);
  };

  const handleAutoLockTimeoutChange = () => {
    Alert.alert(
      'Auto Lock Timeout',
      'Select timeout duration',
      [
        { text: '1 minute', onPress: () => updateSetting('autoLockTimeout', 1) },
        { text: '5 minutes', onPress: () => updateSetting('autoLockTimeout', 5) },
        { text: '10 minutes', onPress: () => updateSetting('autoLockTimeout', 10) },
        { text: '30 minutes', onPress: () => updateSetting('autoLockTimeout', 30) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateSetting = async (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    await settingsService.updateSettings('app', updatedSettings);
  };

  const clearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            // In a real app, you'd clear the cache here
            Alert.alert('Success', 'Cache cleared successfully');
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

  const renderOption = (value, label, isSelected, onPress) => (
    <TouchableOpacity
      style={[styles.option, isSelected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          {label}
        </Text>
      </View>
      {isSelected && (
        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <Text style={styles.settingSubtitle}>Theme</Text>
            {renderOption('light', 'Light', settings.theme === 'light', () =>
              handleThemeChange('light')
            )}
            {renderOption('dark', 'Dark', settings.theme === 'dark', () =>
              handleThemeChange('dark')
            )}
            {renderOption('auto', 'Auto (System)', settings.theme === 'auto', () =>
              handleThemeChange('auto')
            )}
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => navigation.navigate('LanguageSelection')}
              activeOpacity={0.7}
            >
              <View style={styles.languageButtonLeft}>
                <Ionicons name="language" size={24} color={theme.colors.primary} />
                <View style={styles.languageTextContainer}>
                  <Text style={styles.languageLabel}>App Language</Text>
                  <Text style={styles.languageValue}>
                    {settings.language === 'en' ? 'English' : 'বাংলা (Bengali)'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'finger-print',
              'Biometric Authentication',
              'Use fingerprint or face ID to unlock app',
              settings.biometricAuth,
              () => handleToggle('biometricAuth')
            )}
            {renderSettingRow(
              'lock-closed',
              'Auto Lock',
              'Automatically lock app after inactivity',
              settings.autoLock,
              () => handleToggle('autoLock')
            )}
            {settings.autoLock && (
              <TouchableOpacity
                style={styles.timeoutButton}
                onPress={handleAutoLockTimeoutChange}
                activeOpacity={0.7}
              >
                <View style={styles.timeoutButtonLeft}>
                  <Text style={styles.timeoutLabel}>Auto Lock Timeout</Text>
                  <Text style={styles.timeoutValue}>{settings.autoLockTimeout} minutes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Data Usage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Usage</Text>
          <View style={styles.card}>
            <Text style={styles.settingSubtitle}>Data Mode</Text>
            {renderOption(
              'standard',
              'Standard',
              settings.dataUsage === 'standard',
              () => handleDataUsageChange('standard')
            )}
            {renderOption(
              'low',
              'Low Data Mode',
              settings.dataUsage === 'low',
              () => handleDataUsageChange('low')
            )}
            {renderOption(
              'unlimited',
              'Unlimited',
              settings.dataUsage === 'unlimited',
              () => handleDataUsageChange('unlimited')
            )}
            <Text style={styles.dataUsageNote}>
              Low data mode reduces image quality and limits background updates to save data.
            </Text>
          </View>
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'cloud-done',
              'Enable Cache',
              'Cache data for faster loading',
              settings.cacheEnabled,
              () => handleToggle('cacheEnabled')
            )}
            <TouchableOpacity
              style={styles.clearCacheButton}
              onPress={clearCache}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              <Text style={styles.clearCacheText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>
              Some settings may require app restart to take effect.
            </Text>
            <Text style={styles.appVersion}>SafetyNet v1.0.0</Text>
          </View>
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
  settingSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundLight,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: theme.colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  optionLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  optionLabelSelected: {
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  languageButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageTextContainer: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  languageLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  languageValue: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  timeoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingLeft: 48,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  timeoutButtonLeft: {
    flex: 1,
  },
  timeoutLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  timeoutValue: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  dataUsageNote: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingLeft: 48,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  clearCacheText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.medium,
    marginLeft: theme.spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});

export default AppSettingsScreen;

