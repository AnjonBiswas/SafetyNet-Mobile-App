import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@safetynet-parent:settings';

/**
 * Default settings
 */
const defaultSettings = {
  notifications: {
    sosAlerts: true,
    geofenceAlerts: true,
    batteryAlerts: true,
    sound: true,
    vibration: true,
  },
  app: {
    theme: 'light', // 'light' or 'dark'
    language: 'eng', // 'eng' or 'ban'
    mapType: 'standard', // 'standard' or 'satellite'
  },
};

/**
 * Get all settings
 */
export const getSettings = async () => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

/**
 * Save settings
 */
export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (updates) => {
  try {
    const current = await getSettings();
    const updated = {
      ...current,
      notifications: {
        ...current.notifications,
        ...updates,
      },
    };
    return await saveSettings(updated);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
};

/**
 * Update app settings
 */
export const updateAppSettings = async (updates) => {
  try {
    const current = await getSettings();
    const updated = {
      ...current,
      app: {
        ...current.app,
        ...updates,
      },
    };
    return await saveSettings(updated);
  } catch (error) {
    console.error('Error updating app settings:', error);
    return false;
  }
};

