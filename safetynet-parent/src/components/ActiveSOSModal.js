import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import theme from '../utils/theme';

const ActiveSOSModal = ({ visible, alert, onClose, onView }) => {
  const navigation = useNavigation();
  const [sound, setSound] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  /**
   * Play alarm sound
   */
  const playAlarmSound = async () => {
    try {
      // Set audio mode for alarm
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Note: In production, add an actual alarm sound file to assets/sounds/alarm.mp3
      // For now, we'll use vibration and haptics only
      // Uncomment below when you have the sound file:
      /*
      const { sound: alarmSound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/alarm.mp3'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSound(alarmSound);
      */
    } catch (error) {
      console.error('Error setting up alarm sound:', error);
      // Fallback: Use vibration only
    }
  };

  /**
   * Start vibration pattern
   */
  const startVibration = () => {
    if (Platform.OS === 'ios') {
      // iOS haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      // Android vibration pattern: vibrate for 500ms, pause 200ms, repeat
      Vibration.vibrate([500, 200, 500, 200, 500], true);
    }
  };

  /**
   * Stop alarm
   */
  const stopAlarm = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      Vibration.cancel();
    } catch (error) {
      console.error('Error stopping alarm:', error);
    }
  };

  /**
   * Start pulse animation
   */
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  /**
   * Start shake animation
   */
  const startShakeAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.delay(200),
      ])
    ).start();
  };

  /**
   * Handle modal visibility changes
   */
  useEffect(() => {
    if (visible && alert) {
      // Start alarm and animations
      playAlarmSound();
      startVibration();
      startPulseAnimation();
      startShakeAnimation();
    } else {
      // Stop alarm when modal closes
      stopAlarm();
      pulseAnim.setValue(1);
      shakeAnim.setValue(0);
    }

    return () => {
      stopAlarm();
    };
  }, [visible, alert]);

  /**
   * Handle view alert
   */
  const handleView = () => {
    stopAlarm();
    if (onView) {
      onView();
    } else if (alert?.id) {
      navigation.navigate('SOSAlertDetail', { alertId: alert.id });
    }
    if (onClose) {
      onClose();
    }
  };

  /**
   * Handle accept (acknowledge)
   */
  const handleAccept = () => {
    stopAlarm();
    if (onClose) {
      onClose();
    }
    // Navigate to alert detail
    if (alert?.id) {
      navigation.navigate('SOSAlertDetail', { alertId: alert.id });
    }
  };

  /**
   * Format time ago
   */
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins < 60) return `${diffMins} minutes ago`;
    return `${Math.floor(diffMins / 60)} hours ago`;
  };

  /**
   * Get child name
   */
  const getChildName = () => {
    return alert?.child?.full_name || alert?.child?.name || 'Your Child';
  };

  /**
   * Get location snippet
   */
  const getLocationSnippet = () => {
    if (alert?.address) {
      return alert.address.length > 60 ? alert.address.substring(0, 60) + '...' : alert.address;
    }
    if (alert?.latitude && alert?.longitude) {
      return `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`;
    }
    return 'Location not available';
  };

  if (!alert) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      onRequestClose={() => {
        // Prevent easy dismissal - require user action
        Alert.alert('SOS Alert Active', 'Please acknowledge or view the alert to dismiss.');
      }}
    >
      <LinearGradient
        colors={['#ff1744', '#d50000', '#b71c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [
                { scale: pulseAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* SOS Icon */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Text style={styles.iconText}>🚨</Text>
            </Animated.View>
          </View>

          {/* Alert Text */}
          <Text style={styles.alertTitle}>SOS ALERT</Text>
          <Text style={styles.alertSubtitle}>Emergency Assistance Requested</Text>

          {/* Child Info */}
          <View style={styles.childInfoCard}>
            <Text style={styles.childName}>{getChildName()}</Text>
            <Text style={styles.childLocation}>📍 {getLocationSnippet()}</Text>
            <Text style={styles.childTime}>{getTimeAgo(alert.triggered_at)}</Text>
          </View>

          {/* Warning Message */}
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Your child has triggered an SOS alert. Please check their location and contact them immediately.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.acknowledgeButton}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acknowledgeButtonText}>✓ I Acknowledge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={handleView}
              activeOpacity={0.8}
            >
              <Text style={styles.viewButtonText}>📍 View Details & Track</Text>
            </TouchableOpacity>
          </View>

          {/* Emergency Info */}
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyText}>
              If this is a real emergency, contact local authorities immediately.
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  iconText: {
    fontSize: 64,
  },
  alertTitle: {
    fontSize: theme.fonts.sizes['4xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    letterSpacing: 4,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  alertSubtitle: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textWhite,
    opacity: 0.9,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  childInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  childName: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  childLocation: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textWhite,
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  childTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textWhite,
    opacity: 0.8,
    textAlign: 'center',
  },
  warningCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  warningText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textWhite,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: theme.fonts.weights.medium,
  },
  actionsContainer: {
    width: '100%',
    gap: theme.spacing.md,
  },
  acknowledgeButton: {
    backgroundColor: theme.colors.textWhite,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...theme.shadows.lg,
  },
  acknowledgeButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.error,
  },
  viewButton: {
    borderColor: theme.colors.textWhite,
    borderWidth: 2,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  viewButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textWhite,
  },
  emergencyInfo: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emergencyText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textWhite,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ActiveSOSModal;

