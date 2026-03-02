import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import api from './api';

// Simple interval-based sharing (Expo Go friendly).
// For production background tracking, use TaskManager + startLocationUpdatesAsync.

let locationTimer = null;
let isSharingLocation = false;

const NORMAL_INTERVAL_MS = 60_000; // 60s normal
const SOS_INTERVAL_MS = 10_000; // 10s during SOS

let currentInterval = NORMAL_INTERVAL_MS;

async function getBatteryLevel() {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return Math.round((level || 0) * 100);
  } catch (error) {
    console.warn('Failed to get battery level', error);
    return null;
  }
}

async function sendLocationOnce() {
  try {
    // Check current permission status
    let { status } = await Location.getForegroundPermissionsAsync();
    
    // If not granted, request permission
    if (status !== 'granted') {
      console.log('[Location] Requesting location permission...');
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        console.warn('[Location] Location permission not granted for sharing');
        return;
      }
      status = newStatus;
    }

    // Permission is granted, get location
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const battery_level = await getBatteryLevel();

    await api.post('/child/location/update', {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      battery_level,
    });
    
    console.log('[Location] Location sent successfully');
  } catch (error) {
    console.error('[Location] locationSharingService.sendLocationOnce error', error);
  }
}

function startTimer() {
  stopTimer();
  locationTimer = setInterval(sendLocationOnce, currentInterval);
}

function stopTimer() {
  if (locationTimer) {
    clearInterval(locationTimer);
    locationTimer = null;
  }
}

const locationSharingService = {
  /**
   * Start periodic location sharing.
   * @param {{ sosMode?: boolean }} options
   */
  async startLocationSharing(options = {}) {
    const { sosMode = false } = options;
    
    // Check and request permission first
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[Location] Requesting location permission before starting sharing...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('[Location] Cannot start location sharing: permission denied');
          return false; // Return false to indicate failure
        }
        status = newStatus;
      }
      
      console.log('[Location] Permission granted, starting location sharing...');
      currentInterval = sosMode ? SOS_INTERVAL_MS : NORMAL_INTERVAL_MS;
      isSharingLocation = true;

      // Send one immediately, then start interval
      await sendLocationOnce();
      startTimer();
      console.log('[Location] Location sharing started successfully');
      return true; // Return true to indicate success
    } catch (error) {
      console.error('[Location] Error starting location sharing:', error);
      return false;
    }
  },

  /**
   * Stop periodic location sharing.
   */
  stopLocationSharing() {
    isSharingLocation = false;
    stopTimer();
  },

  /**
   * One-shot manual update.
   */
  async updateLocation() {
    await sendLocationOnce();
  },

  /**
   * Placeholder for background updates.
   */
  async startBackgroundUpdates() {
    console.warn(
      'Background location updates require TaskManager and startLocationUpdatesAsync; not implemented in Expo Go demo.'
    );
  },

  isSharing() {
    return isSharingLocation;
  },
};

export default locationSharingService;


