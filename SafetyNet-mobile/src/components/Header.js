import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import theme from '../utils/theme'

/**
 * Simple header matching brand style
 * Props:
 * - title: string
 * - subtitle: optional string
 */
function Header({ title, subtitle }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fonts.sizes['3xl'],
    fontFamily: theme.fonts.heading,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textWhite,
    marginTop: theme.spacing.xs,
    opacity: 0.9,
  },
})

export default Header
