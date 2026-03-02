import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@safetynet:profile';
const SETTINGS_KEY = '@safetynet:settings';

/**
 * Profile Service
 * Mock service for managing user profile data (local storage only)
 */
class ProfileService {
  /**
   * Get user profile
   * @returns {Promise<Object>} Profile data
   */
  async getProfile() {
    try {
      // Always get current user email from AuthContext storage
      let userEmail = null;
      try {
        const userJson = await AsyncStorage.getItem('@safetynet:user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          userEmail = userData?.email;
        }
      } catch (e) {
        // Ignore error
      }

      const profileData = await AsyncStorage.getItem(PROFILE_KEY);
      if (profileData) {
        const profile = JSON.parse(profileData);
        // Always sync email from AuthContext
        if (userEmail && profile.email !== userEmail) {
          profile.email = userEmail;
          await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        }
        return {
          success: true,
          data: profile,
        };
      }

      // Return default mock profile if none exists
      // Try to get user data from AsyncStorage (set by AuthContext)
      let userData = null;
      try {
        const userJson = await AsyncStorage.getItem('@safetynet:user');
        if (userJson) {
          userData = JSON.parse(userJson);
        }
      } catch (e) {
        // Ignore error
      }

      const defaultProfile = {
        id: userData?.id || 1,
        name: userData?.name || 'Jane Doe',
        email: userEmail || userData?.email || 'jane.doe@example.com', // Always use AuthContext email
        phone: '+1234567890',
        dob: '1990-01-15',
        bloodGroup: 'O+',
        address: '123 Safety Street, City, State 12345',
        profileImage: null,
        isVerified: true,
        emergencyReady: true,
      };

      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
      return {
        success: true,
        data: defaultProfile,
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      return {
        success: false,
        message: 'Failed to load profile',
        data: null,
      };
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(profileData) {
    try {
      // Always get current user email from AuthContext storage
      let userEmail = null;
      try {
        const userJson = await AsyncStorage.getItem('@safetynet:user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          userEmail = userData?.email;
        }
      } catch (e) {
        // Ignore error
      }

      const currentProfile = await this.getProfile();
      const updatedProfile = {
        ...currentProfile.data,
        ...profileData,
        id: currentProfile.data.id, // Preserve ID
        email: userEmail || currentProfile.data.email, // Always use AuthContext email
      };

      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
      return {
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        message: 'Failed to update profile',
        data: null,
      };
    }
  }

  /**
   * Get user settings
   * @returns {Promise<Object>} Settings data
   */
  async getSettings() {
    try {
      const settingsData = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsData) {
        return {
          success: true,
          data: JSON.parse(settingsData),
        };
      }

      // Return default settings
      const defaultSettings = {
        notificationsEnabled: true,
        locationSharingEnabled: true,
        language: 'English',
      };

      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      return {
        success: true,
        data: defaultSettings,
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        success: false,
        message: 'Failed to load settings',
        data: null,
      };
    }
  }

  /**
   * Update user settings
   * @param {Object} settingsData - Updated settings
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(settingsData) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings.data,
        ...settingsData,
      };

      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      return {
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully',
      };
    } catch (error) {
      console.error('Error updating settings:', error);
      return {
        success: false,
        message: 'Failed to update settings',
        data: null,
      };
    }
  }

  /**
   * Validate password (mock validation)
   * @param {string} currentPassword - Current password
   * @returns {Promise<Object>} Validation result
   */
  async validatePassword(currentPassword) {
    // Mock validation - in real app, this would check against stored hash
    // For demo purposes, accept any non-empty password
    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentPassword && currentPassword.length > 0) {
          resolve({
            success: true,
            message: 'Password validated',
          });
        } else {
          resolve({
            success: false,
            message: 'Current password is required',
          });
        }
      }, 500); // Simulate API delay
    });
  }

  /**
   * Update password (mock - no real storage)
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Update result
   */
  async updatePassword(newPassword) {
    // Mock update - in real app, this would hash and store password
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Password updated successfully',
        });
      }, 500);
    });
  }
}

export default new ProfileService();

