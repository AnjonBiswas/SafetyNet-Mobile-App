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
 * AlertPreferencesScreen
 * Manage alert and notification preferences
 */
function AlertPreferencesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    sosAlerts: true,
    reportAlerts: true,
    safetyTipsAlerts: true,
    emergencyUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const alertSettings = await settingsService.getSettingCategory('alerts');
      setSettings(alertSettings);
    } catch (error) {
      console.error('Error loading alert settings:', error);
      Alert.alert('Error', 'Failed to load alert preferences');
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
      await settingsService.updateSettings('alerts', updatedSettings);
    } catch (error) {
      console.error('Error saving setting:', error);
      // Revert on error
      setSettings(settings);
      Alert.alert('Error', 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (key, value) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    settingsService.updateSettings('alerts', updatedSettings);
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
          <Text style={styles.loadingText}>Loading preferences...</Text>
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
        <Text style={styles.headerTitle}>Alert Preferences</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Alerts</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'alert-circle',
              'SOS Alerts',
              'Get notified when SOS is activated',
              settings.sosAlerts,
              () => handleToggle('sosAlerts')
            )}
            {renderSettingRow(
              'document-text',
              'Report Alerts',
              'Notifications for new reports and updates',
              settings.reportAlerts,
              () => handleToggle('reportAlerts')
            )}
            {renderSettingRow(
              'shield-checkmark',
              'Safety Tips Alerts',
              'Daily safety tips and reminders',
              settings.safetyTipsAlerts,
              () => handleToggle('safetyTipsAlerts')
            )}
            {renderSettingRow(
              'warning',
              'Emergency Updates',
              'Critical safety updates and warnings',
              settings.emergencyUpdates,
              () => handleToggle('emergencyUpdates')
            )}
          </View>
        </View>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'volume-high',
              'Sound',
              'Play sound for notifications',
              settings.soundEnabled,
              () => handleToggle('soundEnabled')
            )}
            {renderSettingRow(
              'phone-portrait',
              'Vibration',
              'Vibrate for notifications',
              settings.vibrationEnabled,
              () => handleToggle('vibrationEnabled')
            )}
          </View>
        </View>

        {/* Quiet Hours Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'moon',
              'Enable Quiet Hours',
              'Silence non-emergency notifications during specified hours',
              settings.quietHoursEnabled,
              () => handleToggle('quietHoursEnabled')
            )}
            {settings.quietHoursEnabled && (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>Start Time</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => {
                        // In a real app, you'd use a time picker
                        Alert.alert('Time Picker', 'Select start time', [
                          { text: 'Cancel' },
                          { text: 'OK', onPress: () => {} },
                        ]);
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                      <Text style={styles.timeText}>{settings.quietHoursStart}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeLabel}>End Time</Text>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => {
                        Alert.alert('Time Picker', 'Select end time', [
                          { text: 'Cancel' },
                          { text: 'OK', onPress: () => {} },
                        ]);
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                      <Text style={styles.timeText}>{settings.quietHoursEnd}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.quietHoursNote}>
                  Emergency alerts will still be delivered during quiet hours
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Emergency alerts (SOS) will always be delivered regardless of these settings to ensure
            your safety.
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  timeContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  timeLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  quietHoursNote: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
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
  infoText: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
    lineHeight: 20,
  },
});

export default AlertPreferencesScreen;

