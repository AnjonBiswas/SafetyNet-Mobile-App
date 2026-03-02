import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SafetyResourcesScreen from '../screens/SafetyResourcesScreen';
import SafetyResourcesHome from '../screens/SafetyResourcesHome';
import LegalRightsScreen from '../screens/LegalRightsScreen';
import SelfDefenseTipsScreen from '../screens/SelfDefenseTipsScreen';
import WarningSignsScreen from '../screens/WarningSignsScreen';
import EducationScreen from '../screens/EducationScreen';
import SafeSpacesScreen from '../screens/SafeSpacesScreen';
import SafeMapScreen from '../screens/SafeMapScreen';
import SOSActiveScreen from '../screens/SOSActiveScreen';
import IncidentReportScreen from '../screens/IncidentReportScreen';
import EmergencyHelplinesScreen from '../screens/EmergencyHelplinesScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ReportDetailsScreen from '../screens/ReportDetailsScreen';
import ReportsAnalyticsScreen from '../screens/ReportsAnalyticsScreen';
import ViewProfileScreen from '../screens/ViewProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import TrustedContactsScreen from '../screens/TrustedContactsScreen';
import AlertPreferencesScreen from '../screens/AlertPreferencesScreen';
import LocationSettingsScreen from '../screens/LocationSettingsScreen';
import AppSettingsScreen from '../screens/AppSettingsScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import FAQScreen from '../screens/FAQScreen';
import ContactSupportScreen from '../screens/ContactSupportScreen';
import ReportBugScreen from '../screens/ReportBugScreen';
import ParentRequestsScreen from '../screens/ParentRequestsScreen';
import LinkedParentsScreen from '../screens/LinkedParentsScreen';
import ParentsScreen from '../screens/ParentsScreen';
import AddParentScreen from '../screens/AddParentScreen';
import SentRequestsScreen from '../screens/SentRequestsScreen';
import ScanParentQRScreen from '../screens/ScanParentQRScreen';
import ChatScreen from '../screens/ChatScreen';
import DrawerMenu from '../components/DrawerMenu';
import theme from '../utils/theme';

const Stack = createStackNavigator();

// Navigation ref for navigating outside components (e.g., push notifications)
export const navigationRef = createNavigationContainerRef();

/**
 * App Navigator
 * Handles navigation based on authentication state
 */
function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} key={isLoggedIn ? 'authenticated' : 'unauthenticated'}>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#ffffff' },
        }}
      >
        {!isLoggedIn ? (
          // Auth Stack - When user is not logged in
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main Stack - When user is logged in
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen
              name="SOSActive"
              component={SOSActiveScreen}
              options={{
                gestureEnabled: false, // Prevent swipe back during emergency
                headerShown: false,
              }}
            />
            <Stack.Screen name="SafetyResources" component={SafetyResourcesScreen} />
            <Stack.Screen name="SafetyResourcesHome" component={SafetyResourcesHome} />
            <Stack.Screen name="LegalRights" component={LegalRightsScreen} />
            <Stack.Screen name="SelfDefenseTips" component={SelfDefenseTipsScreen} />
            <Stack.Screen name="WarningSigns" component={WarningSignsScreen} />
            <Stack.Screen name="Education" component={EducationScreen} />
            <Stack.Screen name="SafeSpaces" component={SafeSpacesScreen} />
            <Stack.Screen name="SafeMap" component={SafeMapScreen} />
            <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
            <Stack.Screen name="EmergencyHelplines" component={EmergencyHelplinesScreen} />
            <Stack.Screen name="MyReports" component={MyReportsScreen} />
            <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} />
            <Stack.Screen name="Analytics" component={ReportsAnalyticsScreen} />
            <Stack.Screen name="ViewProfile" component={ViewProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="TrustedContacts" component={TrustedContactsScreen} />
            {/* Alerts & Location */}
            <Stack.Screen name="AlertPreferences" component={AlertPreferencesScreen} />
            <Stack.Screen name="LocationSettings" component={LocationSettingsScreen} />
            {/* Settings */}
            <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
            {/* Help & Support */}
            <Stack.Screen name="FAQ" component={FAQScreen} />
            <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
            <Stack.Screen name="ReportBug" component={ReportBugScreen} />
            {/* Parent Linking */}
            <Stack.Screen name="ParentRequests" component={ParentRequestsScreen} />
            <Stack.Screen name="LinkedParents" component={LinkedParentsScreen} />
            <Stack.Screen name="Parents" component={ParentsScreen} />
            <Stack.Screen name="AddParent" component={AddParentScreen} />
            <Stack.Screen name="SentRequests" component={SentRequestsScreen} />
            <Stack.Screen name="ScanParentQR" component={ScanParentQRScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
      {/* DrawerMenu must be inside NavigationContainer to use useNavigation hook */}
      {isLoggedIn && <DrawerMenu />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

export default AppNavigator;
