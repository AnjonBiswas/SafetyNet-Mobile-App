/**
 * Unified Report Service
 * Merges incident reports and SOS reports into a single unified format
 */

import { getUserReports } from './reportService'
import { getUserSOSReports } from './sosReportService'

/**
 * Get all reports (both incident and SOS) for the current user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Unified reports data
 */
export const getAllUserReports = async (userId = 1) => {
  try {
    // Fetch both types of reports in parallel
    const [incidentResult, sosResult] = await Promise.all([
      getUserReports(userId),
      getUserSOSReports(userId),
    ])

    // Ensure we have data
    if (!incidentResult.success) {
      console.warn('⚠️ Failed to fetch incident reports:', incidentResult)
    }
    if (!sosResult.success) {
      console.warn('⚠️ Failed to fetch SOS reports:', sosResult)
    }
    
    // Debug: Log what we received
    console.log('📊 Unified Service - Fetch Results:')
    console.log('  - Incident result success:', incidentResult.success)
    console.log('  - Incident data count:', incidentResult.data?.length || 0)
    console.log('  - SOS result success:', sosResult.success)
    console.log('  - SOS data count:', sosResult.data?.length || 0)

    // Transform incident reports to unified format
    const incidentReports = (incidentResult.data || []).map((report) => ({
      id: report.id,
      reportType: 'INCIDENT',
      incidentType: report.incidentType,
      sosReason: null,
      description: report.description,
      location: report.location,
      locationDetails: report.locationDetails,
      createdAt: report.createdAt,
      incidentDate: report.incidentDate,
      status: report.status,
      isAnonymous: report.isAnonymous,
      evidenceFiles: report.evidenceFiles || [],
      perpetratorDescription: report.perpetratorDescription,
      witnesses: report.witnesses,
      resolvedAt: null,
    }))

    // Transform SOS reports to unified format
    const sosReports = (sosResult.data || []).map((report) => ({
      id: report.id,
      reportType: 'SOS',
      incidentType: null,
      sosReason: report.sosReason,
      description: report.sosReason, // Use sosReason as description
      location: report.location,
      locationDetails: null,
      createdAt: report.createdAt,
      incidentDate: report.createdAt,
      status: report.status,
      isAnonymous: report.isAnonymous,
      evidenceFiles: [],
      perpetratorDescription: null,
      witnesses: null,
      resolvedAt: report.resolvedAt,
    }))

    // Merge and sort by newest first
    const allReports = [...incidentReports, ...sosReports].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // Debug logging
    console.log('📊 Unified Service - Incident reports:', incidentReports.length)
    console.log('📊 Unified Service - SOS reports:', sosReports.length)
    console.log('📊 Unified Service - Total merged:', allReports.length)
    if (sosReports.length > 0) {
      console.log('📊 Unified Service - SOS report IDs:', sosReports.map(r => r.id))
      console.log('📊 Unified Service - SOS report details:', sosReports.map(r => ({
        id: r.id,
        reason: r.sosReason,
        status: r.status,
        createdAt: r.createdAt
      })))
    }

    return {
      success: true,
      data: allReports,
      message: 'Reports fetched successfully',
    }
  } catch (error) {
    console.error('Error fetching unified reports:', error)
    return {
      success: false,
      data: [],
      message: 'Failed to fetch reports',
    }
  }
}

/**
 * Get analytics data from all reports
 * @param {number} userId - User ID
 * @param {string} timeRange - '7days' | '30days' | 'all'
 * @returns {Promise<Object>} Analytics data
 */
export const getReportsAnalytics = async (userId = 1, timeRange = 'all') => {
  try {
    const result = await getAllUserReports(userId)
    const allReports = result.data || []

    // Filter by time range
    const now = new Date()
    let filteredReports = allReports

    if (timeRange === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filteredReports = allReports.filter((r) => new Date(r.createdAt) >= sevenDaysAgo)
    } else if (timeRange === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filteredReports = allReports.filter((r) => new Date(r.createdAt) >= thirtyDaysAgo)
    }

    // Calculate statistics
    const totalReports = filteredReports.length
    const incidentReports = filteredReports.filter((r) => r.reportType === 'INCIDENT').length
    const sosReports = filteredReports.filter((r) => r.reportType === 'SOS').length

    // Debug logging
    console.log('📈 Analytics - Time range:', timeRange)
    console.log('📈 Analytics - Total reports:', totalReports)
    console.log('📈 Analytics - Incident reports:', incidentReports)
    console.log('📈 Analytics - SOS reports:', sosReports)

    // Reports by status
    const statusCounts = {
      Pending: filteredReports.filter((r) => r.status === 'Pending').length,
      Active: filteredReports.filter((r) => r.status === 'Active').length,
      Resolved: filteredReports.filter((r) => r.status === 'Resolved').length,
      Escalated: filteredReports.filter((r) => r.status === 'Escalated').length,
    }

    // Reports over time (last 7 days)
    const reportsOverTime = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const count = filteredReports.filter((r) => {
        const reportDate = new Date(r.createdAt).toISOString().split('T')[0]
        return reportDate === dateStr
      }).length
      reportsOverTime.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      })
    }

    return {
      success: true,
      data: {
        totalReports,
        incidentReports,
        sosReports,
        statusCounts,
        reportsOverTime,
      },
      message: 'Analytics fetched successfully',
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return {
      success: false,
      data: null,
      message: 'Failed to fetch analytics',
    }
  }
}

export default {
  getAllUserReports,
  getReportsAnalytics,
}

