import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import theme from '../utils/theme';

function HomeScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>SafetyNet</Text>
        <Text style={styles.tagline}>Your Safety, Our Priority</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeText}>
            {user?.full_name || user?.email}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Quick Actions</Text>
          <Text style={styles.infoText}>
            • Report an incident{'\n'}
            • View your reports{'\n'}
            • Manage emergency contacts{'\n'}
            • Access SOS emergency{'\n'}
            • Chat with support
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  logoText: {
    fontSize: theme.fonts.sizes['4xl'],
    fontFamily: theme.fonts.heading,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textWhite,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  welcomeCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  welcomeTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.heading,
  },
  welcomeText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  infoCard: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  infoTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  logoutButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default HomeScreen;
