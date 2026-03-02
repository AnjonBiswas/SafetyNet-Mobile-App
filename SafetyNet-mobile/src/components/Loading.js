import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import theme from '../utils/theme'

/**
 * Full-screen loading overlay
 * Props:
 * - message: optional string
 */
function Loading({ message = 'Loading...' }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  box: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  text: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
  },
})

export default Loading
