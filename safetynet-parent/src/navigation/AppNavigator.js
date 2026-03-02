import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import NotificationBadge from '../components/NotificationBadge';
import { useBadgeCounts } from '../hooks/useBadgeCounts';
import theme from '../utils/theme';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Dashboard Tab Screens
import DashboardScreen from '../screens/main/DashboardScreen';

// Children Tab Screens
import ChildrenListScreen from '../screens/main/ChildrenListScreen';
import ChildrenScreen from '../screens/main/ChildrenScreen';
import ChildDetailScreen from '../screens/main/ChildDetailScreen';
import LiveTrackingScreen from '../screens/main/LiveTrackingScreen';
import LocationHistoryScreen from '../screens/main/LocationHistoryScreen';
import AddChildScreen from '../screens/main/AddChildScreen';
import SentRequestsScreen from '../screens/main/SentRequestsScreen';

// Alerts Tab Screens
import SOSAlertListScreen from '../screens/main/SOSAlertListScreen';
import SOSAlertDetailScreen from '../screens/main/SOSAlertDetailScreen';

// Notifications Tab Screen
import NotificationsScreen from '../screens/main/NotificationsScreen';

// Profile Tab Screen
import ProfileScreen from '../screens/main/ProfileScreen';

// Chat Tab Screen
import ChatScreen from '../screens/main/ChatScreen';

// Modal Screens
import LinkChildScreen from '../screens/linking/LinkChildScreen';
import GenerateQRCodeScreen from '../screens/linking/GenerateQRCodeScreen';
import CreateGeofenceScreen from '../screens/main/CreateGeofenceScreen';
import GeofencesScreen from '../screens/main/GeofencesScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navigation ref for navigating outside components (e.g., push notifications)
export const navigationRef = createNavigationContainerRef();

// Loading Screen Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

// ============================================
// AUTH STACK NAVIGATOR
// ============================================
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.textWhite,
          headerTitleStyle: {
            fontWeight: theme.fonts.weights.bold,
          },
          title: 'Create Account',
        }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// DASHBOARD TAB STACK
// ============================================
const DashboardStack = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color={theme.colors.textWhite} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// CHILDREN TAB STACK
// ============================================
const ChildrenStack = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const LogoutButton = () => (
    <TouchableOpacity
      onPress={handleLogout}
      style={{ marginRight: 16 }}
      activeOpacity={0.7}
    >
      <Ionicons name="log-out-outline" size={24} color={theme.colors.textWhite} />
    </TouchableOpacity>
  );

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      <Stack.Screen
        name="ChildrenList"
        component={ChildrenListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Children"
        component={ChildrenScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChildDetail"
        component={ChildDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddChild"
        component={AddChildScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SentRequests"
        component={SentRequestsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LiveTracking"
        component={LiveTrackingScreen}
        options={{
          title: 'Live Tracking',
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen
        name="LocationHistory"
        component={LocationHistoryScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Geofences"
        component={GeofencesScreen}
        options={{
          title: 'Geofences',
          headerRight: () => <LogoutButton />,
        }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// ALERTS TAB STACK
// ============================================
const AlertsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.error,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      <Stack.Screen
        name="SOSAlertList"
        component={SOSAlertListScreen}
        options={{ title: 'SOS Alerts' }}
      />
      <Stack.Screen
        name="SOSAlertDetail"
        component={SOSAlertDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// NOTIFICATIONS TAB STACK
// ============================================
const NotificationsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      <Stack.Screen
        name="NotificationsMain"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// CHAT TAB STACK
// ============================================
const ChatStack = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      <Stack.Screen
        name="ChatMain"
        component={ChatScreen}
        options={{
          headerShown: false,
          // Note: ChatScreen has its own header, logout can be added there if needed
        }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// PROFILE TAB STACK
// ============================================
const ProfileStack = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={24} color={theme.colors.textWhite} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// MAIN TAB NAVIGATOR
// ============================================
const MainTabs = () => {
  const { pendingRequestsCount, unreadNotificationsCount, unreadMessagesCount } = useBadgeCounts();

  // Debug logging
  React.useEffect(() => {
    console.log('[AppNavigator] Badge counts:', {
      pendingRequests: pendingRequestsCount,
      unreadNotifications: unreadNotificationsCount,
      unreadMessages: unreadMessagesCount,
    });
  }, [pendingRequestsCount, unreadNotificationsCount, unreadMessagesCount]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: theme.fonts.sizes.xs,
          fontWeight: theme.fonts.weights.medium,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChildrenTab"
        component={ChildrenStack}
        options={{
          tabBarLabel: 'Children',
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative', width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="people" size={size} color={color} />
              <NotificationBadge count={pendingRequestsCount} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatStack}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => {
            // Debug: Log badge count
            if (unreadMessagesCount > 0) {
              console.log('[AppNavigator] 🎯 ChatTab badge should show:', unreadMessagesCount);
            }
            return (
              <View style={{ position: 'relative', width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="chatbubbles" size={size} color={color} />
                <NotificationBadge count={unreadMessagesCount} />
              </View>
            );
          },
        }}
      />
    </Tab.Navigator>
  );
};

// ============================================
// MAIN STACK NAVIGATOR (Authenticated)
// ============================================
const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.textWhite,
        headerTitleStyle: {
          fontWeight: theme.fonts.weights.bold,
        },
      }}
    >
      {/* Main Tabs */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />

      {/* Alerts Stack (accessible via navigation, not in tabs) */}
      <Stack.Screen
        name="AlertsTab"
        component={AlertsStack}
        options={{
          title: 'SOS Alerts',
          presentation: 'card',
        }}
      />

      {/* Notifications Stack (accessible via navigation, not in tabs) */}
      <Stack.Screen
        name="NotificationsTab"
        component={NotificationsStack}
        options={{
          title: 'Notifications',
          presentation: 'card',
        }}
      />

      {/* Profile Stack (accessible via navigation, not in tabs) */}
      <Stack.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: 'Profile',
          presentation: 'card',
        }}
      />

      {/* Modal Screens */}
      <Stack.Screen
        name="LinkChild"
        component={LinkChildScreen}
        options={{
          title: 'Link Child',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="GenerateQRCode"
        component={GenerateQRCodeScreen}
        options={{
          title: 'QR Code',
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="CreateGeofence"
        component={CreateGeofenceScreen}
        options={{
          title: 'Create Geofence',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="GeofenceList"
        component={GeofencesScreen}
        options={{
          title: 'Geofences',
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
};

// ============================================
// ROOT APP NAVIGATOR
// ============================================
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Debug logging
  React.useEffect(() => {
    console.log('AppNavigator: isAuthenticated changed to:', isAuthenticated);
    console.log('AppNavigator: isLoading:', isLoading);
  }, [isAuthenticated, isLoading]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

export default AppNavigator;
