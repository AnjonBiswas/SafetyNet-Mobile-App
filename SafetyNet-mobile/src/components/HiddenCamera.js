// Hidden Camera component for background video recording
// Note: Expo Camera requires a visible component, so we use a minimal 1x1px view
import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Camera } from 'expo-camera'
import { setCameraRef, requestCameraPermissions } from '../services/cameraService'

function HiddenCamera() {
  const cameraRef = useRef(null)
  const [hasPermission, setHasPermission] = useState(null)

  // Callback ref to set camera ref immediately when Camera component mounts
  const setCameraRefCallback = (ref) => {
    console.log('Camera ref callback called, ref:', ref ? 'exists' : 'null')
    cameraRef.current = ref
    if (ref && hasPermission) {
      // Small delay to ensure camera is mounted
      setTimeout(() => {
        setCameraRef(ref)
        console.log('✅ Camera ref set successfully via callback')
      }, 500)
    } else if (ref) {
      console.log('Camera ref exists but waiting for permission...')
    }
  }

  useEffect(() => {
    // Request permissions and set camera ref
    const setupCamera = async () => {
      try {
        await requestCameraPermissions()
        setHasPermission(true)

        // If camera ref is already set, update it
        if (cameraRef.current) {
          setCameraRef(cameraRef.current)
          console.log('Camera ref set after permission granted')
        }
      } catch (error) {
        console.error('Camera setup error:', error)
        setHasPermission(false)
      }
    }

    setupCamera()

    return () => {
      // Cleanup on unmount
      setCameraRef(null)
    }
  }, [])

  // Update camera ref when permission is granted
  useEffect(() => {
    if (hasPermission && cameraRef.current) {
      // Wait a bit for camera to fully initialize
      setTimeout(() => {
        setCameraRef(cameraRef.current)
        console.log('✅ Camera ref updated after permission change, camera should be ready')
      }, 1000)
    }
  }, [hasPermission])

  if (hasPermission === null) {
    return null // Wait for permission
  }

  if (hasPermission === false) {
    return null // No permission
  }

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <Camera
        ref={setCameraRefCallback}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        videoStabilizationMode={Camera.Constants.VideoStabilization.auto}
        onCameraReady={() => {
          // Camera is ready, ensure ref is set
          console.log('📹 onCameraReady callback fired - camera is fully initialized')
          if (cameraRef.current) {
            // Small delay to ensure camera is fully running
            setTimeout(() => {
              setCameraRef(cameraRef.current)
              console.log('✅ Camera ready - ref set and camera is running')
            }, 300)
          }
        }}
        onMountError={(error) => {
          console.error('❌ Camera mount error:', error)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 100, // Minimum size for camera to work properly
    height: 100,
    overflow: 'hidden',
    opacity: 0, // Completely invisible
    // Position off-screen but still mounted
    left: -200,
    top: -200,
    zIndex: -9999,
  },
  camera: {
    width: 100,
    height: 100,
  },
})

export default HiddenCamera
