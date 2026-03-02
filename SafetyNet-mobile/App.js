import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DrawerProvider } from './src/context/DrawerContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  handleNotificationResponseNavigation,
} from './src/services/pushNotificationService';
import { startLiveLocation, stopLiveLocation } from './src/services/liveLocationService';
import theme from './src/utils/theme';

// Main App Content Component
function AppContent() {
  const { isLoading, isLoggedIn } = useAuth();
  const hasRegisteredPush = useRef(false);
  const notificationListenersRef = useRef(null);

  // Set up notification listeners (only for navigation, not in-app display)
  useEffect(() => {
    if (!isLoggedIn) return;

    notificationListenersRef.current = setupNotificationListeners({
      onNotificationReceived: (notification) => {
        // Just log - we don't show in-app notifications anymore
        console.log('[App] Notification received via listener:', notification);
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
  }, [isLoggedIn]);

  // Register for push notifications after login
  useEffect(() => {
    const register = async () => {
      try {
        console.log('[App] 🚀 Starting push notification registration...');
        console.log('[App] User logged in:', isLoggedIn);
        
        // Small delay to ensure app is fully loaded and auth is complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        console.log('[App] Calling registerForPushNotificationsAsync...');
        const token = await registerForPushNotificationsAsync();
        
        if (token) {
          console.log('[App] ✅ Push notification token obtained successfully');
          console.log('[App] Token preview:', token.substring(0, 30) + '...');
        } else {
          // In Expo Go without projectId, this is expected - local notifications still work
          const isExpoGo = Constants.executionEnvironment === 'storeClient';
          if (isExpoGo) {
            console.log('[App] ℹ️ Push token not available in Expo Go (requires EAS projectId)');
            console.log('[App] ✅ Local notifications will work via Pusher when app is running');
            console.log('[App] 💡 For push notifications when app is closed, create a development build');
          } else {
            console.error('[App] ❌ Push notification token is NULL');
            console.error('[App] Possible reasons:');
            console.error('[App] 1. Permissions not granted - check device settings');
            console.error('[App] 2. ProjectId issue - check app.json');
            console.error('[App] 3. Expo service unavailable');
            console.error('[App] Please check the logs above for detailed error information');
          }
        }
      } catch (error) {
        // Don't block app if push notification registration fails
        console.error('[App] ❌ Push notification registration failed');
        console.error('[App] Error message:', error.message);
        console.error('[App] Error stack:', error.stack);
        console.error('[App] Full error:', error);
      }
    };

    if (isLoggedIn && !hasRegisteredPush.current) {
      console.log('[App] User is logged in, registering push notifications...');
      hasRegisteredPush.current = true;
      register(); // Don't await - run in background
    } else if (!isLoggedIn) {
      console.log('[App] User logged out, resetting push registration flag');
      hasRegisteredPush.current = false;
    }
  }, [isLoggedIn]);

  // Live location: send position to backend while app is open so parent can track on map
  useEffect(() => {
    if (isLoggedIn) {
      startLiveLocation();
    } else {
      stopLiveLocation();
    }
    return () => stopLiveLocation();
  }, [isLoggedIn]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      <AppNavigator />
    </>
  );
}


// Root App Component with AuthProvider
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFE5F1" translucent />
      <AuthProvider>
          <DrawerProvider>
        <AppContent />
          </DrawerProvider>
      </AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
