import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Logo fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()

    // Rotating pattern animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      }),
    ).start()
  }, [])

  const rotateInterpolate1 = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const rotateInterpolate2 = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  })

  const rotateInterpolate3 = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  return (
    <LinearGradient
      colors={['#FFE5F1', '#FFD6E8', '#FFC8DF', '#FFB6D6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Pattern Background Elements */}
      <View style={styles.patternContainer}>
        {/* Rotating decorative circles */}
        <Animated.View
          style={[
            styles.patternCircle1,
            {
              transform: [{ rotate: rotateInterpolate1 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.patternCircle2,
            {
              transform: [{ rotate: rotateInterpolate2 }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.patternCircle3,
            {
              transform: [{ rotate: rotateInterpolate3 }],
            },
          ]}
        />

        {/* Static pattern elements */}
        <View style={styles.patternDot1} />
        <View style={styles.patternDot2} />
        <View style={styles.patternDot3} />
        <View style={styles.patternDot4} />
        <View style={styles.patternDot5} />
        <View style={styles.patternDot6} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.appName}>SafetyNet</Text>
          <Text style={styles.tagline}>Your Safety, Our Priority</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  // Rotating pattern circles
  patternCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    borderColor: 'rgba(255, 182, 193, 0.3)',
    top: -100,
    right: -100,
  },
  patternCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: 'rgba(255, 192, 203, 0.25)',
    bottom: -80,
    left: -80,
  },
  patternCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(255, 182, 193, 0.2)',
    top: '50%',
    left: -50,
    marginTop: -100,
  },
  // Static pattern dots
  patternDot1: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 182, 193, 0.4)',
    top: '20%',
    right: '15%',
  },
  patternDot2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 192, 203, 0.35)',
    top: '30%',
    right: '25%',
  },
  patternDot3: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 182, 193, 0.3)',
    bottom: '25%',
    left: '20%',
  },
  patternDot4: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 192, 203, 0.35)',
    bottom: '35%',
    left: '30%',
  },
  patternDot5: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 182, 193, 0.4)',
    top: '60%',
    right: '30%',
  },
  patternDot6: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255, 192, 203, 0.3)',
    top: '70%',
    right: '20%',
  },
  content: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#C2185B',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '500',
    letterSpacing: 1,
    opacity: 0.9,
  },
})

export default SplashScreen

