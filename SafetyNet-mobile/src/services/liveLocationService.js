/**
 * Live Location Service
 * When the child app is open and user is logged in, periodically sends
 * the device location to the backend so parents can see live movement on the map.
 */
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { childLocationAPI } from './api';

const INTERVAL_MS = 15000; // Send location every 15 seconds when app is open
let intervalId = null;
let isRunning = false;

/**
 * Get current position and send to backend.
 */
async function sendLocationUpdate() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettings: false,
    });

    const { latitude, longitude } = location.coords;
    let batteryLevel = null;
    if (Platform.OS === 'android' && typeof global?.NativeModules?.Battery !== 'undefined') {
      try {
        batteryLevel = await global.NativeModules.Battery.getBatteryLevel?.();
      } catch (_) {}
    }

    await childLocationAPI.updateLocation(latitude, longitude, batteryLevel);
  } catch (error) {
    if (__DEV__) {
      console.log('[LiveLocation] Update failed:', error?.message || error);
    }
  }
}

/**
 * Start sending live location updates (when app is in foreground).
 * Call when user is logged in.
 */
export function startLiveLocation() {
  if (isRunning) return;
  isRunning = true;

  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        isRunning = false;
        return;
      }
      // Send immediately, then every INTERVAL_MS
      await sendLocationUpdate();
      intervalId = setInterval(sendLocationUpdate, INTERVAL_MS);
    } catch (error) {
      isRunning = false;
      if (__DEV__) console.log('[LiveLocation] Start failed:', error?.message);
    }
  })();
}

/**
 * Stop sending live location updates.
 * Call on logout or when leaving the app.
 */
export function stopLiveLocation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
}

export function isLiveLocationRunning() {
  return isRunning;
}
