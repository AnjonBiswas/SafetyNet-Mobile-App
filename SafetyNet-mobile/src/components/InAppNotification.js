import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * InAppNotification Component
 * Shows a slide-down banner notification when app is in foreground
 */
function InAppNotification({ notification, onDismiss, onPress, visible }) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide down
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      dismiss();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          dismiss();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  console.log('[InAppNotification] Render check:', { visible, hasNotification: !!notification });
  
  if (!visible || !notification) {
    console.log('[InAppNotification] Not rendering - visible:', visible, 'notification:', !!notification);
    return null;
  }

  const { title, body, data } = notification.request?.content || notification;
  const type = data?.type || 'default';
  console.log('[InAppNotification] Rendering notification:', { title, body, type });

  // Get icon and color based on type
  const getNotificationStyle = () => {
    switch (type) {
      case 'LINK_REQUEST_RECEIVED':
        return {
          icon: 'people-outline',
          color: theme.colors.primary,
          backgroundColor: '#fff',
        };
      case 'LINK_REQUEST_ACCEPTED':
        return {
          icon: 'checkmark-circle-outline',
          color: theme.colors.success,
          backgroundColor: '#fff',
        };
      case 'LINK_REQUEST_REJECTED':
        return {
          icon: 'close-circle-outline',
          color: theme.colors.error,
          backgroundColor: '#fff',
        };
      default:
        return {
          icon: 'notifications-outline',
          color: theme.colors.primary,
          backgroundColor: '#fff',
        };
    }
  };

  const style = getNotificationStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[styles.notification, { backgroundColor: style.backgroundColor }]}
        onPress={() => {
          if (onPress) onPress(notification);
          dismiss();
        }}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: style.color + '20' }]}>
            <Ionicons name={style.icon} size={24} color={style.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title || 'Notification'}
            </Text>
            {body && (
              <Text style={styles.body} numberOfLines={2}>
                {body}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
  },
  notification: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    ...theme.shadows.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  body: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  closeButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
});

export default InAppNotification;

