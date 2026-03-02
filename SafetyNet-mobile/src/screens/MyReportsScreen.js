import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { getAllUserReports } from '../services/unifiedReportService'
import ReportCard from '../components/ReportCard'
import theme from '../utils/theme'
import { useAuth } from '../context/AuthContext'

/**
 * MyReportsScreen
 * Displays all incident reports submitted by the logged-in user
 */
function MyReportsScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('All') // All, Incident Reports, SOS Reports

  // Fetch reports (both incident and SOS)
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getAllUserReports(user?.id || 1)
      console.log('MyReports - Fetch result:', result)
      if (result.success) {
        const reportsData = result.data || []
        console.log('MyReports - Setting reports:', reportsData.length, 'total')
        console.log('MyReports - SOS reports:', reportsData.filter(r => r.reportType === 'SOS').length)
        console.log('MyReports - Incident reports:', reportsData.filter(r => r.reportType === 'INCIDENT').length)
        setReports(reportsData)
      } else {
        console.error('MyReports - Failed to fetch:', result.message)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  // Load reports on mount and when screen comes into focus
  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useFocusEffect(
    useCallback(() => {
      fetchReports()
    }, [fetchReports])
  )

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchReports()
  }, [fetchReports])

  // Handle report card press
  const handleReportPress = (report) => {
    navigation.navigate('ReportDetails', { reportId: report.id })
  }

  // Filter reports
  const filteredReports =
    filter === 'All'
      ? reports
      : filter === 'Incident Reports'
      ? reports.filter((report) => report.reportType === 'INCIDENT')
      : filter === 'SOS Reports'
      ? reports.filter((report) => report.reportType === 'SOS')
      : reports

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={styles.emptyText}>
        {filter === 'All'
          ? "You haven't submitted any reports yet."
          : filter === 'Incident Reports'
          ? "You haven't submitted any incident reports yet."
          : "You haven't triggered any SOS reports yet."}
      </Text>
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => navigation.navigate('IncidentReport')}
        activeOpacity={0.8}
      >
        <Text style={styles.reportButtonText}>Submit a Report</Text>
      </TouchableOpacity>
    </View>
  )

  // Render loading skeleton
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading your reports...</Text>
    </View>
  )

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
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['All', 'Incident Reports', 'SOS Reports'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[styles.filterTab, filter === filterOption && styles.filterTabActive]}
              onPress={() => setFilter(filterOption)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === filterOption && styles.filterTabTextActive,
                ]}
              >
                {filterOption}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        renderLoading()
      ) : filteredReports.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} onPress={() => handleReportPress(report)} />
          ))}
        </ScrollView>
      )}
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
  filterContainer: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  filterTab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  filterTabTextActive: {
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
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  reportButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  reportButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
})

export default MyReportsScreen

