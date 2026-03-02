import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { getReportsAnalytics } from '../services/unifiedReportService'
import { BarChart, PieChart, LineChart } from '../components/SimpleChart'
import theme from '../utils/theme'
import { useAuth } from '../context/AuthContext'

/**
 * ReportsAnalyticsScreen
 * Displays visual analytics and summaries of user reports
 */
function ReportsAnalyticsScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState('all') // '7days' | '30days' | 'all'

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getReportsAnalytics(user?.id || 1, timeRange)
      console.log('Analytics - Fetch result:', result)
      if (result.success) {
        console.log('Analytics - Data:', result.data)
        console.log('Analytics - SOS reports count:', result.data?.sosReports)
        setAnalytics(result.data)
      } else {
        console.error('Analytics - Failed to fetch:', result.message)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }, [fetchAnalytics])

  // Render stat card
  const renderStatCard = (icon, label, value, color) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bar-chart-outline" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>No Analytics Data</Text>
      <Text style={styles.emptyText}>
        Submit reports to see analytics and insights about your safety reports.
      </Text>
    </View>
  )

  // Render loading state
  if (loading) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports Analytics</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </LinearGradient>
    )
  }

  if (!analytics || analytics.totalReports === 0) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports Analytics</Text>
          <View style={styles.headerRight} />
        </View>
        {renderEmptyState()}
      </LinearGradient>
    )
  }

  // Prepare chart data with updated colors
  const reportTypeData = [
    { label: 'Incident', value: analytics.incidentReports, color: '#8886F1' }, // Indigo for incidents
    { label: 'SOS', value: analytics.sosReports, color: '#ff638b' }, // Red for SOS
  ]

  const statusData = [
    { label: 'Pending', value: analytics.statusCounts.Pending, color: '#FFB74D' }, // Lighter orange
    { label: 'Active', value: analytics.statusCounts.Active, color: '#64B5F6' }, // Lighter blue
    { label: 'Resolved', value: analytics.statusCounts.Resolved, color: '#81C784' }, // Lighter green
    { label: 'Escalated', value: analytics.statusCounts.Escalated, color: '#BA68C8' }, // Lighter purple
  ].filter((item) => item.value > 0)

  const timeSeriesData = analytics.reportsOverTime.map((item) => ({
    label: item.date,
    value: item.count,
  }))

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
        <Text style={styles.headerTitle}>Reports Analytics</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Time Range Filter */}
      <View style={styles.timeRangeContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRangeScroll}>
          {[
            { label: 'Last 7 Days', value: '7days' },
            { label: 'Last 30 Days', value: '30days' },
            { label: 'All Time', value: 'all' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.timeRangeTab, timeRange === option.value && styles.timeRangeTabActive]}
              onPress={() => setTimeRange(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.timeRangeTabText,
                  timeRange === option.value && styles.timeRangeTabTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          {renderStatCard('clipboard-outline', 'Total Reports', analytics.totalReports, theme.colors.primary)}
          {renderStatCard('document-text-outline', 'Incident Reports', analytics.incidentReports, '#6366F1')}
          {renderStatCard('warning', 'SOS Reports', analytics.sosReports, theme.colors.error)}
        </View>

        {/* Reports by Type - Pie Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Reports by Type</Text>
          <PieChart data={reportTypeData} size={180} />
        </View>

        {/* Reports by Status - Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Reports by Status</Text>
          <BarChart
            data={statusData}
            maxValue={Math.max(...statusData.map((s) => s.value), 1)}
            height={150}
          />
        </View>

        {/* Reports Over Time - Line Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Reports Over Time (Last 7 Days)</Text>
          <LineChart
            data={timeSeriesData}
            maxValue={Math.max(...timeSeriesData.map((t) => t.value), 1)}
            height={150}
            color={theme.colors.primary}
          />
        </View>
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
  timeRangeContainer: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  timeRangeScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  timeRangeTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  timeRangeTabActive: {
    backgroundColor: theme.colors.primary,
  },
  timeRangeTabText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  timeRangeTabTextActive: {
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  chartTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
})

export default ReportsAnalyticsScreen

