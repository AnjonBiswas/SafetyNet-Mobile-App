import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  handleNotificationResponseNavigation,
} from './src/services/pushNotificationService';
import theme from './src/utils/theme';

// CRITICAL: Set notification handler at the TOP LEVEL before anything else
// This ensures notifications are displayed immediately, not queued
// MUST be set before any imports that might schedule notifications
// Configure notification handler - simple approach like child app
Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('[App] Notification handler called - showing notification');
    return {
      shouldShowAlert: true, // CRITICAL: Must be true to show notifications in foreground
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

/**
 * Inner app content that has access to AuthContext.
 * Handles push notification registration and listeners.
 */
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const hasRegisteredPush = useRef(false);
  const notificationListenersRef = useRef(null);

  // Set up notification listeners (only for navigation, not in-app display)
  useEffect(() => {
    if (!isAuthenticated) return;

    notificationListenersRef.current = setupNotificationListeners({
      onNotificationReceived: async (notification) => {
        // Log notification received
        console.log('[App] 🔔🔔🔔 Notification received via listener!');
        console.log('[App] Notification title:', notification.request.content.title);
        console.log('[App] Notification body:', notification.request.content.body);
        console.log('[App] Notification trigger:', notification.request.trigger);
        console.log('[App] Notification data:', JSON.stringify(notification.request.content.data, null, 2));

        // If it's an SOS notification, log it prominently
        if (notification.request.content.data?.type === 'sos') {
          console.log('[App] 🚨🚨🚨 SOS NOTIFICATION RECEIVED!');
          console.log('[App] Alert ID:', notification.request.content.data.alert_id);

          // CRITICAL: Check if notification was queued (Expo Go issue)
          try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            if (scheduled.length > 0) {
              console.warn('[App] ⚠️⚠️⚠️ CRITICAL: SOS notification was QUEUED! Count:', scheduled.length);
              console.warn('[App] This is an Expo Go limitation - notifications may queue');
              console.warn('[App] Scheduled notifications:', scheduled.map(n => ({
                id: n.identifier,
                title: n.content.title,
                trigger: n.trigger,
              })));

              // Force cancel all queued notifications
              await Notifications.cancelAllScheduledNotificationsAsync();
              console.log('[App] ✅ Cancelled all queued notifications');
            } else {
              console.log('[App] ✅ Notification NOT queued - should display immediately');
            }
          } catch (checkError) {
            console.warn('[App] Could not check scheduled notifications:', checkError.message);
          }
        }
      },
      onNotificationResponse: (response) => {
        handleNotificationResponseNavigation(response);
      },
    });

    return () => {
      if (notificationListenersRef.current) {
        notificationListenersRef.current.receivedListener?.remove();
        notificationListenersRef.current.responseListener?.remove();
      }
    };
  }, [isAuthenticated]);

  // Register for push notifications after login (with delay to avoid blocking)
  useEffect(() => {
    const register = async () => {
      try {
        console.log('[App] Starting push notification registration...');
        // Small delay to ensure app is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const token = await registerForPushNotificationsAsync();

        if (token) {
          console.log('[App] ✅ Push notification token obtained:', token.substring(0, 30) + '...');
        } else {
          // In Expo Go without projectId, this is expected - local notifications still work
          const isExpoGo = Constants.executionEnvironment === 'storeClient';
          if (isExpoGo) {
            console.log('[App] ℹ️ Push token not available in Expo Go (requires EAS projectId)');
            console.log('[App] ✅ Local notifications will work via Pusher when app is running');
            console.log('[App] 💡 For push notifications when app is closed, create a development build');
          } else {
            console.warn('[App] ⚠️ Push notification token is null - permissions may not be granted');
          }
        }
      } catch (error) {
        // Don't block app if push notification registration fails
        console.error('[App] ❌ Push notification registration failed:', error.message);
        console.error('[App] Error details:', error);
      }
    };

    if (isAuthenticated && !hasRegisteredPush.current) {
      hasRegisteredPush.current = true;
      register(); // Don't await - run in background
    } else if (!isAuthenticated) {
      hasRegisteredPush.current = false;
    }
  }, [isAuthenticated]);

  return (
    <>
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={theme.colors.primary} />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
