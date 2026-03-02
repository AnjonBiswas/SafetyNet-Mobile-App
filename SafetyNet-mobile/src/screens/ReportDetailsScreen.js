import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { getReportById, deleteReport, getStatusColor, getIncidentIcon } from '../services/reportService'
import { getSOSReportById } from '../services/sosReportService'
import { getAllUserReports } from '../services/unifiedReportService'
import theme from '../utils/theme'

/**
 * ReportDetailsScreen
 * Displays detailed information about a specific incident report
 */
function ReportDetailsScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { reportId } = route.params || {}

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Fetch report details (supports both incident and SOS reports)
  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        // Try to get from unified reports first
        const unifiedResult = await getAllUserReports()
        if (unifiedResult.success) {
          const foundReport = unifiedResult.data.find((r) => r.id === reportId)
          if (foundReport) {
            setReport(foundReport)
            setLoading(false)
            return
          }
        }

        // Fallback: try incident reports
        const incidentResult = await getReportById(reportId)
        if (incidentResult.success) {
          // Transform to unified format
          const transformed = {
            ...incidentResult.data,
            reportType: 'INCIDENT',
            sosReason: null,
          }
          setReport(transformed)
          setLoading(false)
          return
        }

        // Fallback: try SOS reports
        const sosResult = await getSOSReportById(reportId)
        if (sosResult.success) {
          // Transform to unified format
          const transformed = {
            ...sosResult.data,
            reportType: 'SOS',
            incidentType: null,
            description: sosResult.data.sosReason,
          }
          setReport(transformed)
          setLoading(false)
          return
        }

        Alert.alert('Error', 'Report not found')
        navigation.goBack()
      } catch (error) {
        console.error('Error fetching report:', error)
        Alert.alert('Error', 'Failed to load report details')
        navigation.goBack()
      } finally {
        setLoading(false)
      }
    }

    if (reportId) {
      fetchReport()
    }
  }, [reportId, navigation])

  // Handle delete report
  const handleDelete = () => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true)
              const result = await deleteReport(reportId)
              if (result.success) {
                Alert.alert('Success', 'Report deleted successfully', [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ])
              } else {
                Alert.alert('Error', result.message || 'Failed to delete report')
              }
            } catch (error) {
              console.error('Error deleting report:', error)
              Alert.alert('Error', 'Failed to delete report')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  // Format date and time
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      return dateString
    }
  }

  // Render loading state
  if (loading) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading report details...</Text>
        </View>
      </LinearGradient>
    )
  }

  if (!report) {
    return null
  }

  const isSOS = report.reportType === 'SOS'
  const statusColor = getStatusColor(report.status)
  const iconName = isSOS ? 'alert-circle' : getIncidentIcon(report.incidentType)
  const reportTitle = isSOS ? report.sosReason : report.incidentType

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Report Type Card */}
        <View style={[styles.incidentTypeCard, isSOS && styles.sosCard]}>
          <View style={[styles.iconContainer, isSOS && styles.iconContainerSOS]}>
            <Ionicons
              name={iconName}
              size={32}
              color={isSOS ? theme.colors.error : theme.colors.primary}
            />
          </View>
          <View style={styles.incidentTypeContent}>
            <Text style={styles.incidentTypeLabel}>
              {isSOS ? 'SOS Reason' : 'Incident Type'}
            </Text>
            <View style={styles.titleRow}>
              <Text style={[styles.incidentTypeText, isSOS && styles.sosTitle]}>
                {reportTitle}
              </Text>
              <View style={[styles.typeBadge, isSOS && styles.typeBadgeSOS]}>
                <Text style={[styles.typeBadgeText, isSOS && styles.typeBadgeTextSOS]}>
                  {isSOS ? 'SOS' : 'Incident'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{report.status}</Text>
          </View>
        </View>

        {/* Description Section */}
        {!isSOS && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionContent}>{report.description}</Text>
          </View>
        )}

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>{formatDateTime(report.incidentDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>Reported: {formatDateTime(report.createdAt)}</Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={theme.colors.textMuted} />
            <Text style={styles.infoText}>{report.location}</Text>
          </View>
          {report.locationDetails && (
            <Text style={styles.locationDetails}>{report.locationDetails}</Text>
          )}
        </View>

        {/* Perpetrator Description */}
        {!isSOS && report.perpetratorDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Perpetrator Description</Text>
            <Text style={styles.sectionContent}>{report.perpetratorDescription}</Text>
          </View>
        )}

        {/* Witnesses */}
        {!isSOS && report.witnesses && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Witnesses</Text>
            <Text style={styles.sectionContent}>{report.witnesses}</Text>
          </View>
        )}

        {/* Resolved At (for SOS reports) */}
        {isSOS && report.resolvedAt && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolved At</Text>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
              <Text style={styles.infoText}>{formatDateTime(report.resolvedAt)}</Text>
            </View>
          </View>
        )}

        {/* Evidence Section */}
        {!isSOS && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            {report.evidenceFiles && report.evidenceFiles.length > 0 ? (
              <View style={styles.evidenceContainer}>
                {report.evidenceFiles.map((file, index) => (
                  <View key={index} style={styles.evidenceItem}>
                    <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                    <Text style={styles.evidenceText} numberOfLines={1}>
                      {file}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noEvidenceText}>No evidence files attached</Text>
            )}
          </View>
        )}

        {/* Status Explanation */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Status Explanation</Text>
          <Text style={styles.statusExplanation}>
            {report.status === 'Pending' &&
              'Your report is currently under review. Our team will examine the details and take appropriate action.'}
            {report.status === 'Reviewed' &&
              'Your report has been reviewed by our team. We are taking necessary steps to address the incident.'}
            {report.status === 'Action Taken' &&
              'Action has been taken regarding your report. If you need further assistance, please contact support.'}
            {report.status === 'Active' &&
              (isSOS
                ? 'Your SOS alert is currently active. Emergency services have been notified and are responding to your location.'
                : 'Your report is currently active and being processed.')}
            {report.status === 'Resolved' &&
              (isSOS
                ? 'Your SOS alert has been resolved. Help has been provided and the situation is now safe.'
                : 'Your report has been resolved. The incident has been addressed.')}
            {report.status === 'Escalated' &&
              'Your report has been escalated to higher authorities for immediate attention and action.'}
          </Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.7}
          accessibilityLabel="Delete report"
          accessibilityRole="button"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={theme.colors.textWhite} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={theme.colors.textWhite} />
              <Text style={styles.deleteButtonText}>Delete Report</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.md,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  incidentTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  sosCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
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
  iconContainerSOS: {
    backgroundColor: theme.colors.error + '20',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  incidentTypeContent: {
    flex: 1,
  },
  incidentTypeLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  incidentTypeText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
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
  section: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  sectionContent: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    flex: 1,
  },
  locationDetails: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  evidenceContainer: {
    gap: theme.spacing.sm,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    gap: theme.spacing.sm,
  },
  evidenceText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    flex: 1,
  },
  noEvidenceText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  statusSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  statusTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  statusExplanation: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    lineHeight: 22,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
})

export default ReportDetailsScreen

