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
import * as Location from 'expo-location';
import theme from '../utils/theme';
import settingsService from '../services/settingsService';

/**
 * LocationSettingsScreen
 * Manage location sharing and permissions
 */
function LocationSettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [settings, setSettings] = useState({
    locationSharingEnabled: true,
    shareWithTrustedContacts: true,
    shareWithEmergencyServices: true,
    backgroundLocationEnabled: false,
    locationAccuracy: 'high',
    autoShareOnSOS: true,
  });

  useEffect(() => {
    loadSettings();
    checkLocationPermission();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const locationSettings = await settingsService.getSettingCategory('location');
      setSettings(locationSettings);
    } catch (error) {
      console.error('Error loading location settings:', error);
      Alert.alert('Error', 'Failed to load location settings');
    } finally {
      setLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location.coords);
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location.coords);
        Alert.alert('Success', 'Location permission granted');
      } else {
        Alert.alert(
          'Permission Denied',
          'Location permission is required for safety features. Please enable it in your device settings.'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  const requestBackgroundLocationPermission = async () => {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status === 'granted') {
        Alert.alert('Success', 'Background location permission granted');
      } else {
        Alert.alert(
          'Permission Denied',
          'Background location permission is required for continuous location sharing. Please enable it in your device settings.'
        );
      }
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      Alert.alert('Error', 'Failed to request background location permission');
    }
  };

  const handleToggle = async (key) => {
    // Special handling for background location
    if (key === 'backgroundLocationEnabled' && !settings.backgroundLocationEnabled) {
      await requestBackgroundLocationPermission();
    }

    const newValue = !settings[key];
    const updatedSettings = { ...settings, [key]: newValue };
    setSettings(updatedSettings);
    
    try {
      setSaving(true);
      await settingsService.updateSettings('location', updatedSettings);
    } catch (error) {
      console.error('Error saving setting:', error);
      setSettings(settings);
      Alert.alert('Error', 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

  const handleAccuracyChange = (accuracy) => {
    const updatedSettings = { ...settings, locationAccuracy: accuracy };
    setSettings(updatedSettings);
    settingsService.updateSettings('location', updatedSettings);
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

  const renderAccuracyOption = (value, label, description) => {
    const isSelected = settings.locationAccuracy === value;
    return (
      <TouchableOpacity
        style={[styles.accuracyOption, isSelected && styles.accuracyOptionSelected]}
        onPress={() => handleAccuracyChange(value)}
        activeOpacity={0.7}
      >
        <View style={styles.accuracyOptionLeft}>
          <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
            {isSelected && <View style={styles.radioButtonInner} />}
          </View>
          <View style={styles.accuracyTextContainer}>
            <Text style={[styles.accuracyLabel, isSelected && styles.accuracyLabelSelected]}>
              {label}
            </Text>
            {description && (
              <Text style={styles.accuracyDescription}>{description}</Text>
            )}
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Location Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Status */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.permissionHeader}>
              <Ionicons
                name={locationPermission === 'granted' ? 'checkmark-circle' : 'close-circle'}
                size={32}
                color={locationPermission === 'granted' ? theme.colors.success : theme.colors.error}
              />
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionTitle}>Location Permission</Text>
                <Text style={styles.permissionStatus}>
                  {locationPermission === 'granted' ? 'Granted' : 'Not Granted'}
                </Text>
              </View>
            </View>
            {locationPermission !== 'granted' && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
                activeOpacity={0.8}
              >
                <Ionicons name="location" size={20} color={theme.colors.textWhite} />
                <Text style={styles.permissionButtonText}>Grant Location Permission</Text>
              </TouchableOpacity>
            )}
            {currentLocation && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationInfoLabel}>Current Location:</Text>
                <Text style={styles.locationInfoText}>
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Location Sharing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Sharing</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'location',
              'Enable Location Sharing',
              'Allow the app to share your location',
              settings.locationSharingEnabled,
              () => handleToggle('locationSharingEnabled'),
              locationPermission !== 'granted'
            )}
            {renderSettingRow(
              'people',
              'Share with Trusted Contacts',
              'Share location with your trusted contacts',
              settings.shareWithTrustedContacts,
              () => handleToggle('shareWithTrustedContacts'),
              !settings.locationSharingEnabled
            )}
            {renderSettingRow(
              'medical',
              'Share with Emergency Services',
              'Automatically share location during emergencies',
              settings.shareWithEmergencyServices,
              () => handleToggle('shareWithEmergencyServices'),
              !settings.locationSharingEnabled
            )}
            {renderSettingRow(
              'sync',
              'Auto-share on SOS',
              'Automatically share location when SOS is activated',
              settings.autoShareOnSOS,
              () => handleToggle('autoShareOnSOS'),
              !settings.locationSharingEnabled
            )}
          </View>
        </View>

        {/* Background Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Background Location</Text>
          <View style={styles.card}>
            {renderSettingRow(
              'time',
              'Background Location',
              'Share location even when app is in background',
              settings.backgroundLocationEnabled,
              () => handleToggle('backgroundLocationEnabled'),
              !settings.locationSharingEnabled
            )}
            <Text style={styles.backgroundNote}>
              Background location allows continuous location sharing for enhanced safety. This may
              impact battery life.
            </Text>
          </View>
        </View>

        {/* Location Accuracy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Accuracy</Text>
          <View style={styles.card}>
            {renderAccuracyOption(
              'high',
              'High Accuracy',
              'Most accurate, uses more battery'
            )}
            {renderAccuracyOption(
              'balanced',
              'Balanced',
              'Good accuracy with moderate battery usage'
            )}
            {renderAccuracyOption(
              'low',
              'Low Power',
              'Less accurate, saves battery'
            )}
          </View>
        </View>

        {/* Manage Parents */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manage Parents</Text>
            <Text style={styles.sectionDescription}>
              Control which parents can see your location and approve new link requests.
            </Text>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('ParentRequests')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people-circle-outline"
                size={22}
                color={theme.colors.primary}
              />
              <Text style={styles.manageButtonText}>Parent Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('LinkedParents')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={theme.colors.primary}
              />
              <Text style={styles.manageButtonText}>Linked Parents & Sharing</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Info */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.success} />
          <Text style={styles.infoText}>
            Your location data is encrypted and only shared with authorized contacts and emergency
            services. We never sell or share your location data with third parties.
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
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  permissionTextContainer: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  permissionTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  permissionStatus: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
  },
  permissionButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    marginLeft: theme.spacing.xs,
  },
  locationInfo: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  locationInfoLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  locationInfoText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontFamily: 'monospace',
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
  backgroundNote: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  accuracyOption: {
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
  accuracyOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundLight,
  },
  accuracyOptionLeft: {
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
  accuracyTextContainer: {
    flex: 1,
  },
  accuracyLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  accuracyLabelSelected: {
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
  },
  accuracyDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
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

export default LocationSettingsScreen;

