import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import theme from '../utils/theme'

/**
 * Generic Card component to display list items
 * Props:
 * - title: string
 * - subtitle: string
 * - description: string
 * - onPress: function
 * - meta: optional string (e.g., status)
 */
function Card({ title, subtitle, description, onPress, meta }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundCard,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  meta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
})

export default Card
