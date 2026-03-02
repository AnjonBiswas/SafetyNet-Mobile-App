import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@safetynet:settings';

// Default settings
const defaultSettings = {
  // Alert Preferences
  alerts: {
    sosAlerts: true,
    reportAlerts: true,
    safetyTipsAlerts: true,
    emergencyUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  },
  // Location Settings
  location: {
    locationSharingEnabled: true,
    shareWithTrustedContacts: true,
    shareWithEmergencyServices: true,
    backgroundLocationEnabled: false,
    locationAccuracy: 'high', // 'high', 'balanced', 'low'
    autoShareOnSOS: true,
  },
  // App Settings
  app: {
    theme: 'light', // 'light', 'dark', 'auto'
    language: 'en', // 'en', 'bn'
    biometricAuth: false,
    autoLock: false,
    autoLockTimeout: 5, // minutes
    dataUsage: 'standard', // 'standard', 'low', 'unlimited'
    cacheEnabled: true,
  },
  // Privacy & Security
  privacy: {
    shareAnalytics: false,
    crashReports: true,
    dataEncryption: true,
    twoFactorAuth: false,
    sessionTimeout: 30, // minutes
    hidePersonalInfo: false,
  },
};

/**
 * Get all settings
 */
export const getSettings = async () => {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      const savedSettings = JSON.parse(settingsJson);
      // Merge with defaults to ensure all keys exist
      return {
        alerts: { ...defaultSettings.alerts, ...savedSettings.alerts },
        location: { ...defaultSettings.location, ...savedSettings.location },
        app: { ...defaultSettings.app, ...savedSettings.app },
        privacy: { ...defaultSettings.privacy, ...savedSettings.privacy },
      };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

/**
 * Save all settings
 */
export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, message: 'Failed to save settings' };
  }
};

/**
 * Update specific setting category
 */
export const updateSettings = async (category, updates) => {
  try {
    const currentSettings = await getSettings();
    const updatedSettings = {
      ...currentSettings,
      [category]: {
        ...currentSettings[category],
        ...updates,
      },
    };
    return await saveSettings(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, message: 'Failed to update settings' };
  }
};

/**
 * Reset settings to defaults
 */
export const resetSettings = async () => {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    return { success: true };
  } catch (error) {
    console.error('Error resetting settings:', error);
    return { success: false, message: 'Failed to reset settings' };
  }
};

/**
 * Get specific setting category
 */
export const getSettingCategory = async (category) => {
  try {
    const settings = await getSettings();
    return settings[category] || defaultSettings[category];
  } catch (error) {
    console.error('Error getting setting category:', error);
    return defaultSettings[category];
  }
};

const settingsService = {
  getSettings,
  saveSettings,
  updateSettings,
  resetSettings,
  getSettingCategory,
};

export default settingsService;

