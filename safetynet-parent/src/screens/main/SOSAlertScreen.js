import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../utils/theme';

const SOSAlertScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SOS Alerts</Text>
      <Text style={styles.subtitle}>SOS alerts screen coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
});

export default SOSAlertScreen;

