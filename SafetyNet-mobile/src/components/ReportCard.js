import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { getStatusColor, getIncidentIcon } from '../services/reportService'
import theme from '../utils/theme'

/**
 * ReportCard Component
 * Displays a single report in a card format (supports both Incident and SOS reports)
 */
function ReportCard({ report, onPress }) {
  const statusColor = getStatusColor(report.status)
  const isSOS = report.reportType === 'SOS'
  // Use more relevant icons: SOS gets emergency icon, incidents get type-specific icons
  const iconName = isSOS ? 'warning' : getIncidentIcon(report.incidentType)
  const reportTitle = isSOS ? report.sosReason : report.incidentType

  // Format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      }
      if (diffDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      }
      if (diffDays < 7) {
        return `${diffDays} days ago`
      }

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      return dateString
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Report: ${reportTitle}, Type: ${isSOS ? 'SOS' : 'Incident'}, Status: ${report.status}`}
      accessibilityRole="button"
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, isSOS && styles.iconContainerSOS]}>
          <Ionicons
            name={iconName}
            size={24}
            color={isSOS ? theme.colors.error : theme.colors.primary}
          />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.incidentType, isSOS && styles.sosTitle]}>{reportTitle}</Text>
            <View style={[styles.typeBadge, isSOS && styles.typeBadgeSOS]}>
              <Text style={[styles.typeBadgeText, isSOS && styles.typeBadgeTextSOS]}>
                {isSOS ? 'SOS' : 'Incident'}
              </Text>
            </View>
          </View>
          <Text style={styles.dateTime}>{formatDate(report.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{report.status}</Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={16} color={theme.colors.textMuted} />
        <Text style={styles.locationText} numberOfLines={1}>
          {report.location}
        </Text>
      </View>

      {/* Description Preview */}
      {!isSOS && (
        <Text style={styles.description} numberOfLines={2}>
          {report.description}
        </Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  iconContainerSOS: {
    backgroundColor: theme.colors.error + '20',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  sosTitle: {
    color: theme.colors.error,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
  },
  typeBadgeSOS: {
    backgroundColor: theme.colors.error + '20',
  },
  typeBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  typeBadgeTextSOS: {
    color: theme.colors.error,
  },
  headerContent: {
    flex: 1,
  },
  incidentType: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  dateTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    textTransform: 'uppercase',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: 6,
  },
  locationText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    flex: 1,
  },
  description: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    lineHeight: 20,
  },
})

export default ReportCard
