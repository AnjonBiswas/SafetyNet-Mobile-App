import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import theme from '../utils/theme'

/**
 * Public Report Card
 * Props:
 * - item: { area_name, risk_level, incident_type, incident_date, incident_description, is_verified }
 * - onPress: function
 */
function PublicReportCard({ item, onPress }) {
  if (!item) return null
  const riskColor =
    item.risk_level === 'high'
      ? theme.colors.error
      : item.risk_level === 'medium'
        ? theme.colors.primary
        : theme.colors.secondary

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.area_name || 'Area'}</Text>
        <Text style={[styles.risk, { color: riskColor }]}>{item.risk_level || 'medium'}</Text>
      </View>
      <Text style={styles.meta}>
        {item.incident_type || 'Incident'} {item.incident_date ? `• ${item.incident_date}` : ''}
      </Text>
      {item.incident_description ? <Text style={styles.desc}>{item.incident_description}</Text> : null}
      {item.is_verified ? <Text style={styles.verified}>Verified</Text> : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  risk: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
  },
  meta: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  desc: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  verified: {
    marginTop: theme.spacing.xs,
    color: theme.colors.secondary,
    fontWeight: theme.fonts.weights.semibold,
    fontSize: theme.fonts.sizes.sm,
  },
})

export default PublicReportCard
