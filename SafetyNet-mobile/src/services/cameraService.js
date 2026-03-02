// Camera service for SOS video recording
import { Camera } from 'expo-camera'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'

let cameraRef = null
let isRecording = false
let recordingUri = null
let recordingPromise = null

// Set camera reference (called from Camera component)
export function setCameraRef(ref) {
  cameraRef = ref
}

// Get camera reference
export function getCameraRef() {
  return cameraRef
}

// Check camera permissions
export async function requestCameraPermissions() {
  const { status } = await Camera.requestCameraPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Camera permission denied')
  }

  const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync()
  if (audioStatus !== 'granted') {
    throw new Error('Microphone permission denied')
  }

  return true
}

// Start video recording
// Note: recordAsync() returns a Promise that resolves when recording stops
export async function startVideoRecording() {
  if (isRecording) {
    console.log('Already recording')
    return null
  }

  try {
    // Request permissions if not already granted
    await requestCameraPermissions()

    // Wait for camera to be ready (retry mechanism with shorter timeout for faster start)
    let retries = 0
    const maxRetries = 10 // Reduced retries for faster failure detection
    const retryDelay = 100 // Reduced delay for faster response

    while (!cameraRef || !cameraRef.recordAsync) {
      if (retries >= maxRetries) {
        throw new Error('Camera not initialized. Make sure Camera component is mounted on the screen and wait a moment before starting SOS.')
      }
      console.log(`⏳ Waiting for camera to be ready... (${retries + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      retries++
    }

    console.log('✅ Camera ref found with recordAsync method')

    // Additional check: ensure camera has recordAsync method
    if (typeof cameraRef.recordAsync !== 'function') {
      throw new Error('Camera recordAsync method not available. Camera may not be fully initialized.')
    }

    // Minimal wait to ensure camera is ready (reduced from 1000ms to 200ms)
    await new Promise(resolve => setTimeout(resolve, 200))

    console.log('Camera is ready, starting recording...')

    // Start recording - recordAsync() starts immediately and returns a promise
    // that resolves with the video URI when stopRecording() is called
    const options = {
      quality: Camera.Constants.VideoQuality['720p'],
      maxDuration: 3600, // 1 hour max
      mute: false,
    }

    isRecording = true
    console.log('Calling camera.recordAsync()...')

    try {
      // Start recording - the promise will resolve when stopRecording() is called
      recordingPromise = cameraRef.recordAsync(options)
      console.log('recordAsync() called successfully, recording started')
    } catch (recordError) {
      isRecording = false
      console.error('Error calling recordAsync():', recordError)
      throw new Error(`Failed to start recording: ${recordError.message}`)
    }

    // Handle promise resolution (when recording stops)
    recordingPromise.then((result) => {
      recordingUri = result.uri
      isRecording = false
      console.log('Video recording completed:', recordingUri)
    }).catch((error) => {
      console.error('Recording error:', error)
      isRecording = false
      recordingUri = null
      recordingPromise = null
    })

    console.log('Video recording started successfully')
    return null // Recording started, URI will be available when stopped
  } catch (error) {
    console.error('Error starting video recording:', error)
    isRecording = false
    throw error
  }
}

// Stop video recording
export async function stopVideoRecording() {
  if (!cameraRef) {
    console.log('No camera ref to stop')
    return null
  }

  if (!isRecording) {
    console.log('Not currently recording')
    return null
  }

  try {
    // Stop recording - this will resolve the promise from recordAsync()
    cameraRef.stopRecording()

    // Wait for the recording promise to resolve
    if (recordingPromise) {
      const result = await recordingPromise
      recordingUri = result.uri
      recordingPromise = null

      console.log('Video recording stopped:', recordingUri)
      return recordingUri
    }

    return null
  } catch (error) {
    console.error('Error stopping video recording:', error)
    isRecording = false
    recordingUri = null
    recordingPromise = null
    return null
  }
}

// Get recording status
export function getRecordingStatus() {
  return {
    isRecording,
    recordingUri,
  }
}

// Save video to permanent storage (saved to app's document directory)
export async function saveVideoToStorage(videoUri) {
  if (!videoUri) {
    console.log('No video URI provided for saving')
    return null
  }

  try {
    // Ensure document directory exists
    const docDir = FileSystem.documentDirectory
    if (!docDir) {
      throw new Error('Document directory not available')
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `sos-video-${timestamp}.mp4`
    const fileUri = `${docDir}${fileName}`

    console.log('Saving video from:', videoUri)
    console.log('Saving video to:', fileUri)

    // Check if source file exists
    const sourceInfo = await FileSystem.getInfoAsync(videoUri)
    if (!sourceInfo.exists) {
      throw new Error('Source video file does not exist')
    }

    // Copy video to permanent storage
    await FileSystem.copyAsync({
      from: videoUri,
      to: fileUri,
    })

    // Verify the file was saved
    const savedInfo = await FileSystem.getInfoAsync(fileUri)
    if (!savedInfo.exists) {
      throw new Error('Video file was not saved correctly')
    }

    console.log('✅ Video saved successfully to:', fileUri)
    console.log('Video size:', savedInfo.size, 'bytes')

    return fileUri
  } catch (error) {
    console.error('❌ Error saving video:', error)
    console.error('Error details:', error.message)
    return null
  }
}

// Get all saved SOS videos
export async function getSavedVideos() {
  try {
    const docDir = FileSystem.documentDirectory
    if (!docDir) return []

    const files = await FileSystem.readDirectoryAsync(docDir)
    const videoFiles = files
      .filter((file) => file.startsWith('sos-video-') && file.endsWith('.mp4'))
      .map((file) => `${docDir}${file}`)

    return videoFiles
  } catch (error) {
    console.error('Error getting saved videos:', error)
    return []
  }
}

// Upload video to backend (saves to PC storage)
// Using fetch API for more reliable file uploads
export async function uploadVideoToBackend(videoUri, sosEmergencyId = null, alertId = null) {
  if (!videoUri) {
    console.log('❌ No video URI provided for upload')
    return null
  }

  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri)
    if (!fileInfo.exists) {
      throw new Error('Video file does not exist at: ' + videoUri)
    }

    console.log('📤 Starting video upload to backend...')
    console.log('Video URI:', videoUri)
    console.log('File size:', fileInfo.size, 'bytes')
    console.log('File exists:', fileInfo.exists)

    // Get authentication token
    const { getToken } = await import('./api')
    const token = await getToken()

    if (!token) {
      console.error('❌ No authentication token found')
      throw new Error('Authentication required. Please login first.')
    }

    console.log('✅ Authentication token found')

    // Get API base URL
    const { default: api } = await import('./api')
    const baseURL = api.defaults.baseURL
    const uploadURL = `${baseURL}/sos-emergencies/upload-video`

    console.log('Upload URL:', uploadURL)

    // Create FormData for multipart upload
    const formData = new FormData()

    // Get filename from URI or create one
    const fileName = videoUri.split('/').pop() || `sos-video-${Date.now()}.mp4`

    // React Native FormData format
    const fileUri = Platform.OS === 'android'
      ? videoUri
      : (videoUri.startsWith('file://') ? videoUri.replace('file://', '') : videoUri)

    console.log('File URI for upload:', fileUri)
    console.log('File name:', fileName)

    // Append file to FormData
    formData.append('video', {
      uri: fileUri,
      type: 'video/mp4',
      name: fileName,
    })

    if (sosEmergencyId) {
      formData.append('sos_emergency_id', sosEmergencyId.toString())
      console.log('Emergency ID:', sosEmergencyId)
    }

    // Also send alert_id if available (links to new sos_alerts table)
    if (alertId) {
      formData.append('alert_id', alertId.toString())
      console.log('📎 Linking video to alert_id:', alertId)
    }

    console.log('FormData created, sending request...')

    // Use fetch API for more reliable uploads
    const response = await fetch(uploadURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        // Don't set Content-Type - let fetch set it with boundary
      },
      body: formData,
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)

    const responseData = await response.json()
    console.log('Response data:', JSON.stringify(responseData, null, 2))

    if (response.ok && responseData.success) {
      console.log('✅✅✅ Video uploaded successfully!')
      console.log('File saved to:', responseData.data?.full_path)
      console.log('File name:', responseData.data?.file_name)
      console.log('File size:', responseData.data?.file_size, 'bytes')
      return responseData
    } else {
      console.error('❌ Upload failed:', responseData.message || 'Unknown error')
      throw new Error(responseData.message || `Upload failed with status ${response.status}`)
    }
  } catch (error) {
    console.error('❌❌❌ Error uploading video:', error)
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

    // Try to provide more helpful error messages
    if (error.message.includes('Network')) {
      console.error('Network error - check if backend is running and accessible')
    }
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('Authentication error - token may be expired')
    }

    return null
  }
}
