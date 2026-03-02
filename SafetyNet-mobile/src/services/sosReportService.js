/**
 * Mock SOS Report Service
 * Handles SOS report data operations (mock implementation)
 */

// Mock user ID (in real app, this would come from auth context)
const MOCK_USER_ID = 1

// Mock SOS reports data - Using recent dates
const getRecentDate = (daysAgo) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// Initialize with actual dates
const MOCK_SOS_REPORTS = [
  {
    id: 101,
    userId: 1,
    sosReason: 'Feeling unsafe while walking alone at night',
    location: 'Gulshan-2, Dhaka',
    createdAt: getRecentDate(2), // 2 days ago
    status: 'Resolved',
    resolvedAt: getRecentDate(2),
    isAnonymous: false,
  },
  {
    id: 102,
    userId: 1,
    sosReason: 'Suspicious person following me',
    location: 'Dhanmondi, Dhaka',
    createdAt: getRecentDate(5), // 5 days ago
    status: 'Resolved',
    resolvedAt: getRecentDate(5),
    isAnonymous: false,
  },
  {
    id: 103,
    userId: 1,
    sosReason: 'Emergency situation - immediate help needed',
    location: 'Banani, Dhaka',
    createdAt: getRecentDate(10), // 10 days ago
    status: 'Active',
    resolvedAt: null,
    isAnonymous: false,
  },
  {
    id: 104,
    userId: 1,
    sosReason: 'Threatened by unknown person',
    location: 'Uttara, Dhaka',
    createdAt: getRecentDate(15), // 15 days ago
    status: 'Resolved',
    resolvedAt: getRecentDate(15),
    isAnonymous: false,
  },
]

// Debug: Log SOS reports on module load
console.log('SOS Reports loaded:', MOCK_SOS_REPORTS.length, 'reports')

/**
 * Get all SOS reports for the current user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} SOS reports data
 */
export const getUserSOSReports = async (userId = MOCK_USER_ID) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600))

  const userSOSReports = MOCK_SOS_REPORTS.filter((report) => report.userId === userId)
  
  console.log('🚨 SOS Service - getUserSOSReports called')
  console.log('  - Total mock reports in memory:', MOCK_SOS_REPORTS.length)
  console.log('  - Requested User ID:', userId)
  console.log('  - Filtered reports for user:', userSOSReports.length)
  if (userSOSReports.length > 0) {
    console.log('  - Report IDs:', userSOSReports.map(r => r.id))
    console.log('  - Report details:', userSOSReports.map(r => ({
      id: r.id,
      userId: r.userId,
      reason: r.sosReason,
      status: r.status,
      createdAt: r.createdAt,
      location: r.location
    })))
  } else {
    console.log('  - ⚠️ No SOS reports found for user ID:', userId)
    console.log('  - All reports in memory:', MOCK_SOS_REPORTS.map(r => ({ id: r.id, userId: r.userId })))
  }
  
  return {
    success: true,
    data: userSOSReports,
    message: 'SOS reports fetched successfully',
  }
}

/**
 * Get a single SOS report by ID
 * @param {number} reportId - Report ID
 * @returns {Promise<Object>} SOS report data
 */
export const getSOSReportById = async (reportId) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  const report = MOCK_SOS_REPORTS.find((r) => r.id === reportId)
  if (!report) {
    return {
      success: false,
      data: null,
      message: 'SOS report not found',
    }
  }

  return {
    success: true,
    data: report,
    message: 'SOS report fetched successfully',
  }
}

/**
 * Create a new SOS report (mock implementation)
 * @param {Object} sosData - SOS report data
 * @returns {Promise<Object>} Creation result
 */
export const createSOSReport = async (sosData) => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  try {
    // Generate new ID - handle empty array case
    const maxId = MOCK_SOS_REPORTS.length > 0 
      ? Math.max(...MOCK_SOS_REPORTS.map((r) => r.id), 0) 
      : 0
    const newId = maxId + 1

    // Format location - convert coordinates to readable address if needed
    let locationString = sosData.location || 'Location not specified'
    // If location is in coordinate format (lat, lng), convert to address format
    if (locationString.includes(',') && !isNaN(parseFloat(locationString.split(',')[0]))) {
      const [lat, lng] = locationString.split(',').map(s => s.trim())
      locationString = `${lat}, ${lng}` // Keep as coordinates for now
    }

    // Create new SOS report object
    const newReport = {
      id: newId,
      userId: sosData.userId || MOCK_USER_ID,
      sosReason: sosData.sosReason || 'Emergency SOS activated',
      location: locationString,
      createdAt: new Date().toISOString(),
      status: 'Active',
      resolvedAt: null,
      isAnonymous: sosData.isAnonymous || false,
    }

    // Add to the beginning of the array (most recent first)
    MOCK_SOS_REPORTS.unshift(newReport)

    console.log('✅ SOS Report Created:')
    console.log('  - ID:', newReport.id)
    console.log('  - User ID:', newReport.userId)
    console.log('  - Reason:', newReport.sosReason)
    console.log('  - Location:', newReport.location)
    console.log('  - Created At:', newReport.createdAt)
    console.log('  - Total SOS Reports:', MOCK_SOS_REPORTS.length)

    return {
      success: true,
      data: newReport,
      message: 'SOS report created successfully',
    }
  } catch (error) {
    console.error('❌ Error creating SOS report:', error)
    return {
      success: false,
      message: error.message || 'Failed to create SOS report',
    }
  }
}

export default {
  getUserSOSReports,
  getSOSReportById,
  create: createSOSReport,
}

