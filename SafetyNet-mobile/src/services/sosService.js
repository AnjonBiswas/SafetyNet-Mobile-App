// Expo-friendly SOS implementation (works in Expo Go)
// Limitations in Expo Go:
// - SMS cannot be silent; expo-sms opens the SMS composer
// - Single-shot location; no background services

import * as Location from 'expo-location'
import * as SMS from 'expo-sms'
import api from './api'
import { startVideoRecording as startCameraRecording, stopVideoRecording as stopCameraRecording } from './cameraService'
import emergencyContactService from './emergencyContactService'
import locationSharingService from './locationSharingService'

// -------- Contacts handling (in-memory; replace with persistent storage as needed) --------
let emergencyContacts = []

export function addContact(number) {
  if (!number) return
  if (!emergencyContacts.includes(number)) emergencyContacts.push(number)
}

export function getContacts() {
  return emergencyContacts
}

// Load emergency contacts from backend
async function loadEmergencyContacts() {
  try {
    const result = await emergencyContactService.getAll()
    if (result.success && result.data && Array.isArray(result.data)) {
      emergencyContacts = result.data
        .map(contact => contact.phone)
        .filter(phone => phone && phone.trim() !== '')
      console.log(`✅ Loaded ${emergencyContacts.length} emergency contacts for SOS`)
      return emergencyContacts
    } else {
      console.warn('⚠️ No emergency contacts found or failed to load')
      return []
    }
  } catch (error) {
    console.error('❌ Error loading emergency contacts:', error)
    return []
  }
}

// Store current SOS emergency ID for video upload (legacy)
let currentSosEmergencyId = null
// Store current SOS alert ID for video upload (new)
let currentSosAlertId = null

// Store SOS location data for report creation
let currentSosLocation = null

// -------- Location persistence (to backend -> SQLite on server) --------
export async function saveLocationToDB(latitude, longitude) {
  try {
    const payload = {
      user_name: 'SOS User',
      user_email: 'sos@example.com',
      latitude,
      longitude,
      emergency_status: 'active',
      emergency_type: 'sos',
      description: 'Auto SOS location ping',
      priority: 'high',
    }
    const response = await api.post('/sos-emergencies', payload)

    // Store emergency ID for video upload
    if (response.data && response.data.data && response.data.data.id) {
      currentSosEmergencyId = response.data.data.id
      console.log('SOS Emergency ID:', currentSosEmergencyId)
    }

    console.log('Saved location to DB', latitude, longitude)
    return currentSosEmergencyId
  } catch (e) {
    console.log('saveLocationToDB error', e)
    return null
  }
}

// -------- SMS (expo-sms; opens composer, not silent) --------
async function sendEmergencySMS(latitude, longitude) {
  if (!emergencyContacts.length) return
  const isAvailable = await SMS.isAvailableAsync()
  if (!isAvailable) {
    console.log('SMS not available on this device')
    return
  }
  const msg = `🚨 SOS ALERT! I need help. My live location: https://maps.google.com/?q=${latitude},${longitude}`
  // Expo cannot send silently; this will open the SMS composer with recipients prefilled
  await SMS.sendSMSAsync(emergencyContacts, msg)
}

// -------- Video Recording (using Expo Camera) --------
export async function startVideoRecording() {
  try {
    const videoUri = await startCameraRecording()
    console.log('SOS video recording started:', videoUri)
    return videoUri
  } catch (error) {
    console.error('Failed to start video recording:', error)
    // Don't throw - allow SOS to continue even if video fails
    return null
  }
}

export async function stopVideoRecording() {
  try {
    const videoUri = await stopCameraRecording()
    console.log('SOS video recording stopped:', videoUri)
    return videoUri
  } catch (error) {
    console.error('Failed to stop video recording:', error)
    return null
  }
}

// -------- SOS Flow (single-shot on button press) --------
export async function startSOS() {
  // Start video recording IMMEDIATELY (non-blocking, don't wait for it)
  // This ensures recording starts as soon as SOS button is pressed
  startVideoRecording().catch(error => {
    console.error('Video recording failed to start:', error)
    // Don't block SOS flow if video fails
  })

  // Load emergency contacts and get location in parallel
  const [emergencyContactsResult, locationResult] = await Promise.all([
    loadEmergencyContacts(),
    // Location permission and fix
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') throw new Error('Location permission denied')
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      return loc.coords
    })(),
  ])

  const { latitude, longitude } = locationResult

  // Store location for report creation
  currentSosLocation = { latitude, longitude }

  // Save location and notify backend in parallel for faster execution
  const [locationDbResult, sosResponse] = await Promise.all([
    // Legacy SOS location logging (existing endpoint)
    saveLocationToDB(latitude, longitude),
    // Notify linked parents via new Laravel endpoint
    api.post('/child/sos/trigger', {
      latitude,
      longitude,
      message: 'Emergency SOS activated from SafetyNet app',
    }),
  ])

  // Store alert_id from new SOS trigger endpoint
  if (sosResponse && sosResponse.data && sosResponse.data.success && sosResponse.data.data) {
    currentSosAlertId = sosResponse.data.data.alert_id || null
    console.log('✅ Stored SOS alert ID:', currentSosAlertId)
  }

  // Start high-frequency location sharing for parents during SOS
  try {
    await locationSharingService.startLocationSharing({ sosMode: true })
  } catch (error) {
    console.warn('Failed to start SOS location sharing', error)
  }
}

export async function stopSOS(userId = 1) {
  console.log('🛑 Stopping SOS...')
  const videoUri = await stopVideoRecording()
  console.log('Video recording stopped, URI:', videoUri)

  // Get alert ID and emergency ID for video upload
  const alertId = currentSosAlertId
  const emergencyId = currentSosEmergencyId

  // Reset IDs immediately for faster response
  currentSosAlertId = null
  currentSosEmergencyId = null

  // Create SOS report
  const location = currentSosLocation
  currentSosLocation = null // Reset location

  // Tell backend to cancel/resolve the active SOS alert for parents
  // Use alert_id if available, otherwise try emergencyId
  const cancelAlertId = alertId || emergencyId
  if (cancelAlertId) {
    try {
      await api.post('/child/sos/cancel', {
        alert_id: cancelAlertId,
      })
      console.log('✅ SOS alert cancelled successfully')
    } catch (error) {
      console.error('Failed to cancel SOS alert for parents', error)
      // Don't throw - allow SOS to stop even if cancel fails
    }
  } else {
    console.warn('⚠️ No alert ID available to cancel SOS')
  }

  // Stop high-frequency location sharing (fall back to normal if needed elsewhere)
  try {
    locationSharingService.stopLocationSharing()
  } catch (error) {
    console.error('Failed to stop SOS location sharing', error)
  }

  if (location) {
    try {
      // Import SOS report service
      const { createSOSReport } = await import('./sosReportService')

      // Format location string
      const locationString = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`

      // Create SOS report
      console.log('📝 Creating SOS report with data:', {
        userId,
        location: locationString,
        reason: 'Emergency SOS activated'
      })

      const reportResult = await createSOSReport({
        userId: userId,
        sosReason: 'Emergency SOS activated',
        location: locationString,
        isAnonymous: false,
      })

      if (reportResult.success) {
        console.log('✅ SOS report created successfully!')
        console.log('  - Report ID:', reportResult.data.id)
        console.log('  - User ID:', reportResult.data.userId)
        console.log('  - Status:', reportResult.data.status)
        console.log('  - Location:', reportResult.data.location)
        console.log('  - Created At:', reportResult.data.createdAt)
      } else {
        console.warn('⚠️ Failed to create SOS report:', reportResult.message)
      }
    } catch (error) {
      console.error('❌ Error creating SOS report:', error)
      // Don't throw - SOS stopping should still succeed even if report creation fails
    }
  } else {
    console.warn('⚠️ No location data available for SOS report creation')
  }

  // Process video in background (non-blocking)
  if (videoUri) {
    // Use setTimeout to move heavy operations off the main thread
    setTimeout(async () => {
      try {
        // Step 1: Save to device storage first (backup)
        console.log('💾 Step 1: Saving video to device storage...')
        const { saveVideoToStorage } = await import('./cameraService')
        const savedUri = await saveVideoToStorage(videoUri)
        if (savedUri) {
          console.log('✅ Video saved to device:', savedUri)
        } else {
          console.warn('⚠️ Failed to save video to device storage')
        }

        // Step 2: Upload to backend (saves to PC)
        console.log('📤 Step 2: Uploading video to PC...')
        console.log('Video URI:', videoUri)
        console.log('Emergency ID:', emergencyId)
        console.log('Starting upload process...')

        const { uploadVideoToBackend } = await import('./cameraService')

        // Wait a moment to ensure file is fully written
        await new Promise(resolve => setTimeout(resolve, 500))

        const uploadResult = await uploadVideoToBackend(videoUri, emergencyId, alertId)

        if (uploadResult && uploadResult.success) {
          console.log('✅✅✅ SUCCESS: Video uploaded to PC!')
          console.log('📁 File path:', uploadResult.data?.full_path)
          console.log('📄 File name:', uploadResult.data?.file_name)
          console.log('📊 File size:', uploadResult.data?.file_size, 'bytes')
          console.log('📍 Verify file at:', uploadResult.data?.full_path)
        } else {
          console.error('❌❌❌ FAILED: Video upload to PC failed!')
          console.error('Upload result:', uploadResult ? JSON.stringify(uploadResult, null, 2) : 'null')
          console.error('')
          console.error('Troubleshooting steps:')
          console.error('1. Check if backend server is running: php artisan serve')
          console.error('2. Verify API URL is correct:', api.defaults.baseURL?.replace('/api', '') || 'Check api.js')
          console.error('3. Check if you are logged in (authentication required)')
          console.error('4. Check Laravel logs: storage/logs/laravel.log')
          console.error('5. Check network connectivity')
          console.error('')
          console.error('Video is saved locally on device, but not on PC.')
        }
      } catch (error) {
        console.error('❌ Error in background video processing:', error)
        console.error('Error details:', error.message)
        console.error('Stack:', error.stack)
        // Don't throw - video recording stopped successfully
      }
    }, 100) // Small delay to allow UI to update first
  } else {
    console.warn('⚠️ No video URI returned from recording')
  }

  // Return immediately without waiting for video processing
  return { videoUri, emergencyId }
}
