import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { Camera } from 'expo-camera'
import theme from '../utils/theme'
import { stopSOS } from '../services/sosService'
import { setCameraRef, requestCameraPermissions } from '../services/cameraService'
import { useAuth } from '../context/AuthContext'

const { width } = Dimensions.get('window')

function SOSActiveScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const [recordingTime, setRecordingTime] = useState(0)
  const [isStopping, setIsStopping] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [hasPermission, setHasPermission] = useState(null)
  const cameraRef = useRef(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const timerRef = useRef(null)

  useEffect(() => {
    // Request camera permissions and set up camera
    const setupCamera = async () => {
      try {
        await requestCameraPermissions()
        setHasPermission(true)
        // Wait for camera to mount
        await new Promise(resolve => setTimeout(resolve, 500))
        if (cameraRef.current) {
          setCameraRef(cameraRef.current)
          console.log('Camera ref set in SOS Active Screen')
        }
      } catch (error) {
        console.error('Camera permission error:', error)
        setHasPermission(false)
      }
    }

    setupCamera()

    // Wait for camera to be ready, then start SOS
    const initializeSOS = async () => {
      console.log('SOS Active Screen mounted, waiting for camera...')
      // Wait for camera component to mount and initialize
      await new Promise(resolve => setTimeout(resolve, 1500))

      console.log('Starting SOS from SOS Active Screen...')
      try {
        const { startSOS } = await import('../services/sosService')
        await startSOS()
        setCameraReady(true)
        console.log('✅ SOS started successfully from SOS Active Screen')
      } catch (error) {
        console.error('❌ Failed to start SOS:', error)
        const errorMsg = error?.message || 'Unable to start SOS. Please go back and try again.'
        Alert.alert('SOS Error', String(errorMsg))
      }
    }

    initializeSOS()

    // Start recording timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)

    // Pulse animation for recording indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start()

    // Rotating border animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ).start()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [pulseAnim, rotateAnim, navigation])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const handleStopSOS = async () => {
    try {
      setIsStopping(true)
      setUploadProgress('Stopping recording...')

      // Get user ID from auth context
      const userId = user?.id || 1

      // Stop SOS immediately (video processing happens in background)
      const result = await stopSOS(userId)

      // Show immediate feedback - video processing continues in background
      if (result && result.videoUri) {
        Alert.alert(
          '✅ SOS Stopped',
          'Emergency recording stopped. Video is being saved and uploaded in the background.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        )
      } else {
        Alert.alert(
          'SOS Stopped',
          'Emergency recording has been stopped.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        )
      }
    } catch (error) {
      console.error('Error stopping SOS:', error)
      const errorMessage = error?.message || 'Failed to stop SOS. Please try again.'
      Alert.alert(
        'Error',
        String(errorMessage), // Ensure it's a string
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      )
    } finally {
      setIsStopping(false)
      setUploadProgress(null)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#C68CA2', '#b53171', '#C68CA2']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <View style={styles.headerDot} />
            <Text style={styles.headerBadgeText}>LIVE</Text>
          </View>
          <Text style={styles.headerTitle}>EMERGENCY SOS ACTIVE</Text>
          <Text style={styles.headerSubtitle}>Recording in progress</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Camera Preview */}
          {hasPermission && (
            <View style={styles.cameraContainer}>
              <Camera
                ref={cameraRef}
                style={styles.cameraPreview}
                type={Camera.Constants.Type.back}
                videoStabilizationMode={Camera.Constants.VideoStabilization.auto}
                onCameraReady={() => {
                  if (cameraRef.current) {
                    setCameraRef(cameraRef.current)
                    console.log('Camera ready in SOS Active Screen')
                  }
                }}
              />
            </View>
          )}
          {/* Large Recording Circle
          <View style={styles.recordingWrapper}>
            <Animated.View
              style={[
                styles.recordingBorder,
                {
                  transform: [{ rotate: rotateInterpolate }],
                },
              ]}
            >
              <LinearGradient
                colors={['#ff4b6e', '#ff006e', '#ff4b6e']}
                style={styles.borderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.recordingCircle,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={['#ff4b6e', '#ff006e']}
                style={styles.circleGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.recordingInner}>
                  <View style={styles.recordingIcon}>
                    <Text style={styles.recordingIconText}>🔴</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </View> */}

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>RECORDING TIME</Text>
            <Text style={styles.timerValue}>{formatTime(recordingTime)}</Text>
          </View>

          {/* Status Cards */}
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
                <Text style={styles.statusIcon}>📍</Text>
              </View>
              <Text style={styles.statusTitle}>Location</Text>
              <Text style={styles.statusSubtitle}>Shared</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Text style={styles.statusIcon}>📹</Text>
              </View>
              <Text style={styles.statusTitle}>Video</Text>
              <Text style={styles.statusSubtitle}>Recording</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={[styles.statusIconContainer, { backgroundColor: 'rgba(171, 190, 222, 0.2)' }]}>
                <Text style={styles.statusIcon}>👥</Text>
              </View>
              <Text style={styles.statusTitle}>Contacts</Text>
              <Text style={styles.statusSubtitle}>Notified</Text>
            </View>
          </View>

        </View>

        {/* Footer with Stop Button */}
        <View style={styles.footer}>
          {uploadProgress && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#ff4b6e" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.stopButton, isStopping && styles.stopButtonDisabled]}
            onPress={handleStopSOS}
            disabled={isStopping}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ff4b6e', '#ff006e']}
              style={styles.stopButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isStopping ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.stopButtonIcon}>🔴</Text>
                  <Text style={styles.stopButtonText}>STOP EMERGENCY</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.stopHint}>Tap to stop emergency and save data to server.</Text>
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    marginTop: 25,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',


  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 145, 145, 0.29)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(206, 11, 11, 0.77)',
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d11730',
    marginRight: 6,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: theme.fonts.weights.bold,
    color: '#d11730',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: theme.fonts.weights.bold,
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#ffffff',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  cameraContainer: {
    width: '100%',
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: 'rgba(255, 75, 110, 0.5)',
    ...theme.shadows.md,
    marginTop: 10,
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
  },
  recordingWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 5,
  },
  recordingBorder: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 110,
    overflow: 'hidden',
  },
  borderGradient: {
    width: '100%',
    height: '100%',
  },
  recordingCircle: {
    width: 100,
    height: 100,
    borderRadius: 100,
    overflow: 'hidden',
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff4b6e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIconText: {
    fontSize: 24,
    color: '#ffffff',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
    color: '#ffffff',
    opacity: 0.6,
    letterSpacing: 2,
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 22,
    fontWeight: theme.fonts.weights.bold,
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 16,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 24,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: theme.fonts.weights.bold,
    color: '#ffffff',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.8,
  },
  footer: {
    padding: theme.spacing.lg,
    paddingBottom: 30,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  stopButton: {
    width: '88%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#ff4b6e',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  stopButtonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonDisabled: {
    opacity: 0.6,
  },
  stopButtonIcon: {
    fontSize: 24,
    marginRight: 10,
    color: '#ffffff',
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: theme.fonts.weights.bold,
    color: '#ffffff',
    letterSpacing: 1,
  },
  stopHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
})

export default SOSActiveScreen
