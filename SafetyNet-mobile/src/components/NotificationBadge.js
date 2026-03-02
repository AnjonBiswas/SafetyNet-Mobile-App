import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../utils/theme';

/**
 * NotificationBadge Component
 * Shows a count badge on tab icons or other UI elements
 */
function NotificationBadge({ count, style, textStyle, maxCount = 99 }) {
  // Convert to number if it's a string, handle undefined/null
  const numCount = typeof count === 'number' ? count : parseInt(count || 0, 10);
  
  // Return null if count is 0, negative, or NaN
  // Strict check: only show badge if count is a valid positive number
  if (isNaN(numCount) || numCount <= 0) {
    return null;
  }

  const displayCount = numCount > maxCount ? `${maxCount}+` : numCount.toString();

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: theme.fonts.weights.bold,
    textAlign: 'center',
  },
});

export default NotificationBadge;

