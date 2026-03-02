/**
 * Mock Report Service
 * Handles report data operations (mock implementation)
 */

// Mock user ID (in real app, this would come from auth context)
const MOCK_USER_ID = 1

// Mock reports data - Using recent dates
const getRecentDate = (daysAgo, hours = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(date.getHours() - hours)
  return date.toISOString()
}

const MOCK_REPORTS = [
  {
    id: 1,
    userId: 1,
    incidentType: 'Harassment',
    description: 'I was verbally harassed by a group of men while walking home from work. They made inappropriate comments and followed me for several blocks.',
    location: '123 Main Street, Dhaka',
    locationDetails: 'Near the bus stop at the corner',
    incidentDate: getRecentDate(3, 2),
    createdAt: getRecentDate(3),
    status: 'Pending',
    isAnonymous: false,
    evidenceFiles: ['evidence1.jpg', 'evidence2.jpg'],
    perpetratorDescription: 'Three men, approximately 25-30 years old, wearing casual clothes',
    witnesses: 'A shopkeeper nearby witnessed the incident',
  },
  {
    id: 2,
    userId: 1,
    incidentType: 'Theft',
    description: 'My phone was stolen from my bag while I was shopping at the market. I noticed it was missing when I reached home.',
    location: 'New Market, Dhaka',
    locationDetails: 'Inside the market, near the clothing section',
    incidentDate: getRecentDate(7),
    createdAt: getRecentDate(7, 1),
    status: 'Reviewed',
    isAnonymous: false,
    evidenceFiles: [],
    perpetratorDescription: 'Unknown',
    witnesses: 'None',
  },
  {
    id: 3,
    userId: 1,
    incidentType: 'Assault',
    description: 'I was physically assaulted by an unknown person in a parking lot. The person grabbed my arm and tried to pull me into a vehicle.',
    location: 'Gulshan-2, Dhaka',
    locationDetails: 'Parking lot behind the shopping mall',
    incidentDate: getRecentDate(12),
    createdAt: getRecentDate(12, 1),
    status: 'Action Taken',
    isAnonymous: false,
    evidenceFiles: ['evidence3.jpg'],
    perpetratorDescription: 'Male, approximately 35 years old, medium build, wearing a black jacket',
    witnesses: 'Security guard at the mall entrance',
  },
  {
    id: 4,
    userId: 1,
    incidentType: 'Stalking',
    description: 'I have been noticing the same person following me for the past week. They appear at different locations I visit.',
    location: 'Dhanmondi, Dhaka',
    locationDetails: 'Multiple locations in the area',
    incidentDate: getRecentDate(1),
    createdAt: getRecentDate(1, 1),
    status: 'Pending',
    isAnonymous: false,
    evidenceFiles: ['evidence4.jpg', 'evidence5.jpg'],
    perpetratorDescription: 'Male, approximately 28 years old, tall, wearing glasses',
    witnesses: 'None',
  },
]

/**
 * Get all reports for the current user
 * @returns {Promise<Object>} Reports data
 */
export const getUserReports = async (userId = MOCK_USER_ID) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const userReports = MOCK_REPORTS.filter((report) => report.userId === userId)
  return {
    success: true,
    data: userReports,
    message: 'Reports fetched successfully',
  }
}

/**
 * Get a single report by ID
 * @param {number} reportId - Report ID
 * @returns {Promise<Object>} Report data
 */
export const getReportById = async (reportId) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const report = MOCK_REPORTS.find((r) => r.id === reportId)
  if (!report) {
    return {
      success: false,
      data: null,
      message: 'Report not found',
    }
  }

  return {
    success: true,
    data: report,
    message: 'Report fetched successfully',
  }
}

/**
 * Create a new report (mock implementation)
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Creation result
 */
export const createReport = async (reportData) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    // Generate new ID
    const newId = Math.max(...MOCK_REPORTS.map((r) => r.id), 0) + 1

    // Format location
    const location = `${reportData.location_street || ''}, ${reportData.city || ''}`.trim()

    // Format status (capitalize first letter)
    const status = reportData.status
      ? reportData.status.charAt(0).toUpperCase() + reportData.status.slice(1)
      : 'Pending'

    // Format incident type (capitalize first letter)
    const incidentType =
      reportData.incident_type && reportData.incident_type.length > 0
        ? reportData.incident_type
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : 'Other'

    // Create new report object
    const newReport = {
      id: newId,
      userId: reportData.user_id || MOCK_USER_ID,
      incidentType: incidentType,
      description: reportData.description || '',
      location: location || 'Location not specified',
      locationDetails: reportData.location_details || null,
      incidentDate: reportData.incident_date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: status,
      isAnonymous: !reportData.user_id,
      evidenceFiles: reportData.evidence_files || [],
      perpetratorDescription: reportData.perpetrator_description || null,
      witnesses: reportData.witnesses || null,
    }

    // In real app, this would call API to create
    // For mock, we'll add it to the array
    MOCK_REPORTS.unshift(newReport) // Add to beginning of array

    return {
      success: true,
      data: newReport,
      message: 'Report created successfully',
    }
  } catch (error) {
    console.error('Error creating report:', error)
    return {
      success: false,
      message: error.message || 'Failed to create report',
    }
  }
}

/**
 * Delete a report (mock implementation)
 * @param {number} reportId - Report ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteReport = async (reportId) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600))

  const reportIndex = MOCK_REPORTS.findIndex((r) => r.id === reportId)
  if (reportIndex === -1) {
    return {
      success: false,
      message: 'Report not found',
    }
  }

  // In real app, this would call API to delete
  // MOCK_REPORTS.splice(reportIndex, 1)

  return {
    success: true,
    message: 'Report deleted successfully',
  }
}

/**
 * Get status color
 * @param {string} status - Report status
 * @returns {string} Color code
 */
export const getStatusColor = (status) => {
  const statusColors = {
    Pending: '#ff9800', // Orange
    Reviewed: '#2196F3', // Blue
    'Action Taken': '#4CAF50', // Green
    Active: '#2196F3', // Blue
    Resolved: '#4CAF50', // Green
    Escalated: '#9C27B0', // Purple
  }
  return statusColors[status] || '#6b7280'
}

/**
 * Get incident type icon
 * @param {string} incidentType - Incident type
 * @returns {string} Icon name
 */
export const getIncidentIcon = (incidentType) => {
  const iconMap = {
    Harassment: 'chatbubbles-outline', // More relevant for verbal harassment
    Theft: 'wallet-outline', // More specific than bag
    Assault: 'hand-left-outline', // Physical assault icon
    Stalking: 'eye-outline', // Keep eye but with outline
    Cyber: 'shield-outline', // Security/cyber safety
    Other: 'document-text-outline', // Generic document icon
  }
  return iconMap[incidentType] || 'document-text-outline'
}

export default {
  getUserReports,
  getReportById,
  create: createReport,
  deleteReport,
  getStatusColor,
  getIncidentIcon,
}
