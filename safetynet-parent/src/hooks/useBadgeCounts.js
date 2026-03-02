import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import linkRequestService from '../services/linkRequestService';
import notificationService from '../services/notificationService';
import chatService from '../services/chatService';
import { subscribeToParentChannel, unsubscribeFromChannel } from '../services/pusherService';

/**
 * Hook to manage badge counts for tabs
 * Returns pending link requests count, unread notifications count, and unread messages count
 */
export const useBadgeCounts = () => {
  const { parent } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const previousUnreadCountRef = useRef(0);
  const previousNotificationCountRef = useRef(0);
  const lastSOSNotificationIdRef = useRef(null);

  const fetchCounts = useCallback(async () => {
    try {
      // Fetch pending link requests count
      const requestsRes = await linkRequestService.getPendingCount();
      if (requestsRes.success) {
        setPendingRequestsCount(requestsRes.data?.count || 0);
      }

      // Fetch unread notifications count
      const notificationsRes = await notificationService.getUnreadCount();
      if (notificationsRes.success && notificationsRes.data) {
        const count = notificationsRes.data.unread_count || 0;
        const previousCount = previousNotificationCountRef.current;
        console.log('[useBadgeCounts] Setting unread notifications count to:', count, '(previous:', previousCount, ')');

        // If notification count increased, IMMEDIATELY trigger SOS notification (polling fallback)
        // Note: Pusher should trigger instantly, this is just a backup
        if (count > previousCount && previousCount >= 0) {
          // Check if we already processed this via Pusher
          const notificationIdString = `polling-${count}-${Date.now()}`;

          console.log('[useBadgeCounts] ⚠️ Notification count increased from', previousCount, 'to', count, '- checking if already processed...');

          // Only trigger if not already processed via Pusher (to avoid duplicates)
          // We'll trigger anyway but mark it to prevent spam
          try {
            const title = 'SOS Triggered';
            const message = 'A child has triggered an SOS alert. Please check immediately.';

            console.log('[useBadgeCounts] 🚨 Polling fallback: Scheduling SOS notification...');

            // AGGRESSIVE: Cancel ALL notifications multiple times
            for (let i = 0; i < 3; i++) {
              try {
                await Notifications.cancelAllScheduledNotificationsAsync();
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (cancelError) {
                // Ignore
              }
            }
            await new Promise(resolve => setTimeout(resolve, 100));

            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: title,
                body: message,
                data: {
                  type: 'sos',
                  parent_id: parent.id,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: null, // CRITICAL: null = show immediately, not queued
            });

            console.log('[useBadgeCounts] ✅ Polling fallback: SOS notification scheduled with ID:', notificationId);

            // Check if queued and force re-schedule if needed
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
              const afterScheduled = await Notifications.getAllScheduledNotificationsAsync();
              if (afterScheduled.length > 0) {
                console.warn('[useBadgeCounts] ⚠️ Notification was QUEUED! Forcing re-schedule...');
                await Notifications.cancelAllScheduledNotificationsAsync();
                await new Promise(resolve => setTimeout(resolve, 100));
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: title,
                    body: message,
                    data: { type: 'sos', parent_id: parent.id },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                  },
                  trigger: null,
                });
              }
            } catch (checkError) {
              // Ignore
            }

            // Now fetch details in background to update notification if needed
            setTimeout(async () => {
              try {
                const latestNotificationsRes = await notificationService.getNotifications({
                  is_read: false,
                });

                if (latestNotificationsRes.success && latestNotificationsRes.data?.notifications?.length > 0) {
                  const latestNotification = latestNotificationsRes.data.notifications[0];
                  console.log('[useBadgeCounts] Latest notification details:', {
                    id: latestNotification.id,
                    type: latestNotification.type,
                    title: latestNotification.title,
                  });

                  // Check if it's an SOS notification
                  const isSOS = latestNotification.type === 'sos' ||
                    (latestNotification.title && latestNotification.title.toLowerCase().includes('sos'));

                  if (isSOS && latestNotification.id !== lastSOSNotificationIdRef.current) {
                    lastSOSNotificationIdRef.current = latestNotification.id;
                    const childName = latestNotification.child?.name || 'Child';
                    const alertId = latestNotification.data?.alert_id || null;

                    // Update notification with more details
                    console.log('[useBadgeCounts] Updating notification with child details:', childName);
                  }
                }
              } catch (error) {
                console.error('[useBadgeCounts] Error fetching notification details:', error);
              }
            }, 1000);

          } catch (error) {
            console.error('[useBadgeCounts] ❌❌❌ CRITICAL: Failed to schedule SOS notification:', error);
            console.error('[useBadgeCounts] Error details:', error.message, error.stack);

            // Fallback: Show alert
            try {
              const { Alert } = require('react-native');
              Alert.alert(
                'SOS Triggered',
                'A child has triggered an SOS alert. Please check immediately.',
                [{ text: 'OK' }],
                { cancelable: false }
              );
            } catch (alertError) {
              console.error('[useBadgeCounts] Even fallback alert failed:', alertError);
            }
          }
        }

        previousNotificationCountRef.current = count;
        setUnreadNotificationsCount(count);
      } else {
        console.log('[useBadgeCounts] No unread notifications or failed response, setting to 0');
        previousNotificationCountRef.current = 0;
        setUnreadNotificationsCount(0);
      }

      // Fetch unread messages count
      const messagesRes = await chatService.getUnreadCount();
      console.log('[useBadgeCounts] Unread messages API response:', JSON.stringify(messagesRes, null, 2));
      if (messagesRes.success && messagesRes.data) {
        const count = messagesRes.data.unread_count || 0;
        const previousCount = previousUnreadCountRef.current;
        console.log('[useBadgeCounts] Setting unread messages count to:', count, '(previous:', previousCount, ')');

        // If count increased, trigger notification (fallback for when Pusher doesn't work)
        if (count > previousCount && previousCount >= 0) {
          console.log('[useBadgeCounts] ⚠️ Unread count increased via polling - triggering notification');
          try {
            console.log('[useBadgeCounts] 📲 Triggering notification for new message (polling fallback)');

            // Schedule notification
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `💬 New message from Child`,
                body: `You have ${count} unread message${count > 1 ? 's' : ''}`,
                data: {
                  type: 'message',
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null,
            });

            console.log('[useBadgeCounts] ✅ Notification triggered via polling fallback');
          } catch (error) {
            console.error('[useBadgeCounts] Error triggering notification via polling:', error);
          }
        }

        previousUnreadCountRef.current = count;
        setUnreadMessagesCount(count);
      } else {
        console.log('[useBadgeCounts] No unread messages or failed response, setting to 0');
        previousUnreadCountRef.current = 0;
        setUnreadMessagesCount(0);
      }
    } catch (error) {
      console.error('Error fetching badge counts:', error);
    }
  }, []);

  // Listen for real-time message updates via Pusher
  useEffect(() => {
    if (!parent?.id) {
      console.log('[useBadgeCounts] ⚠️ No parent ID - skipping Pusher setup');
      return;
    }

    console.log('[useBadgeCounts] ✅ Setting up Pusher listener for parent:', parent.id);
    console.log('[useBadgeCounts] Parent object:', JSON.stringify({ id: parent.id, email: parent.email }, null, 2));

    const channel = subscribeToParentChannel(parent.id, {
      onSosAlert: async (data) => {
        console.log('[useBadgeCounts] 🚨🚨🚨 INSTANT SOS alert received via Pusher!');
        console.log('[useBadgeCounts] SOS alert data:', {
          hasAlert: !!data.alert,
          alertId: data.alert?.id,
          childId: data.alert?.child_id,
          childName: data.alert?.child_name,
        });

        if (data.alert) {
          try {
            // Backend sends child_name directly, not nested child object
            const childName = data.alert.child_name || data.alert.child?.full_name || data.alert.child?.name || 'Child';
            const address = data.alert.address || 'Location unknown';
            const title = 'SOS Triggered';
            const message = `${childName} has triggered an SOS alert. ${address}`;

            console.log('[useBadgeCounts] ⚡⚡⚡ INSTANTLY scheduling SOS notification via Pusher...');

            // AGGRESSIVE: Cancel ALL notifications multiple times to ensure they're cleared
            for (let i = 0; i < 3; i++) {
              try {
                await Notifications.cancelAllScheduledNotificationsAsync();
                await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between cancellations
              } catch (cancelError) {
                // Ignore
              }
            }
            console.log('[useBadgeCounts] ✅ Cancelled all queued notifications (aggressive cleanup)');

            // Small delay to ensure cancellation is processed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Schedule notification IMMEDIATELY with trigger: null
            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: title,
                body: message,
                data: {
                  type: 'sos',
                  alert_id: data.alert.id,
                  child_id: data.alert.child_id,
                  parent_id: parent.id,
                  latitude: data.alert.latitude,
                  longitude: data.alert.longitude,
                  address: data.alert.address,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: null, // CRITICAL: null = show immediately, not queued
            });

            console.log('[useBadgeCounts] ✅✅✅ INSTANT SOS notification scheduled with ID:', notificationId);

            // Immediately check if notification was queued (should be 0 if displayed instantly)
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait a bit for system to process

            try {
              const afterScheduled = await Notifications.getAllScheduledNotificationsAsync();
              console.log('[useBadgeCounts] Scheduled notifications count after scheduling:', afterScheduled.length);

              if (afterScheduled.length > 0) {
                console.error('[useBadgeCounts] ❌❌❌ CRITICAL: Notification was QUEUED despite trigger: null!');
                console.error('[useBadgeCounts] This is an Expo Go limitation - notifications may queue');
                console.error('[useBadgeCounts] Scheduled notifications:', afterScheduled.map(n => ({
                  id: n.identifier,
                  title: n.content.title,
                  trigger: n.trigger,
                })));

                // Force cancel ALL and try one more time
                console.log('[useBadgeCounts] 🔄🔄🔄 FORCE: Cancelling and re-scheduling one final time...');
                await Notifications.cancelAllScheduledNotificationsAsync();
                await new Promise(resolve => setTimeout(resolve, 100));

                // Final attempt
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: title,
                    body: message,
                    data: {
                      type: 'sos',
                      alert_id: data.alert.id,
                      child_id: data.alert.child_id,
                      parent_id: parent.id,
                      latitude: data.alert.latitude,
                      longitude: data.alert.longitude,
                      address: data.alert.address,
                    },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                  },
                  trigger: null,
                });

                console.log('[useBadgeCounts] ✅ Final re-schedule attempt completed');
              } else {
                console.log('[useBadgeCounts] ✅✅✅ SUCCESS: Notification NOT queued - should display immediately!');
              }
            } catch (checkError) {
              console.warn('[useBadgeCounts] Could not verify notification status:', checkError.message);
            }

            // Mark as processed to prevent duplicate from polling
            if (data.alert.id) {
              lastSOSNotificationIdRef.current = `pusher-${data.alert.id}`;
            }

            // Update badge count in background (non-blocking)
            setTimeout(() => {
              fetchCounts();
            }, 100);
          } catch (error) {
            console.error('[useBadgeCounts] ❌ Failed to schedule SOS notification via Pusher:', error);
            console.error('[useBadgeCounts] Error details:', error.message, error.stack);
          }
        } else {
          console.warn('[useBadgeCounts] ⚠️ SOS alert data missing alert object:', data);
        }
      },
      onNotification: async (data) => {
        // Also handle SOS notifications via NotificationCreated event (fallback)
        if (data.notification && data.notification.type === 'sos') {
          console.log('[useBadgeCounts] 🚨 SOS notification received via NotificationCreated event:', data.notification);
          try {
            const title = 'SOS Triggered';
            const message = data.notification.message || 'Your child has triggered an SOS alert';
            const alertId = data.notification.data?.alert_id || data.notification.sos_alert_id;

            console.log('[useBadgeCounts] 📲 Scheduling SOS notification (via NotificationCreated):', {
              title,
              message,
              alertId,
            });

            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: title,
                body: message,
                data: {
                  type: 'sos',
                  alert_id: alertId,
                  child_id: data.notification.child_id,
                  parent_id: parent.id,
                  ...data.notification.data,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: null, // Show immediately
            });

            console.log('[useBadgeCounts] ✅ SOS notification scheduled (via NotificationCreated) with ID:', notificationId);
          } catch (error) {
            console.error('[useBadgeCounts] ❌ Failed to schedule SOS notification (via NotificationCreated):', error);
          }
        }
      },
      onChatMessage: async (data) => {
        console.log('[useBadgeCounts] Pusher message received:', {
          hasMessage: !!data.message,
          senderType: data.message?.sender_type,
          childId: data.message?.child_id,
          messageId: data.message?.id,
        });

        // When a message is received, refresh the unread count
        // Only count messages from children (not from parent themselves)
        if (data.message && data.message.sender_type === 'child') {
          console.log('[useBadgeCounts] ✅ Child message detected, incrementing badge count');
          
          // Show local notification (works in Expo Go) - simple approach like child app
          try {
            const childName = data.message.child?.full_name || data.message.child?.name || 'Child';
            const messageText = data.message.message || 'New message';
            const preview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
            
            console.log('[useBadgeCounts] 📲 Scheduling notification for child message:', {
              childName,
              preview,
              messageId: data.message.id,
            });
            
            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `💬 New message from ${childName}`,
                body: preview,
                data: {
                  type: 'message',
                  message_id: data.message.id,
                  parent_id: data.message.parent_id,
                  child_id: data.message.child_id,
                },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger: null, // Show immediately
            });
            
            console.log('[useBadgeCounts] ✅ Local notification scheduled with ID:', notificationId);
            
            console.log('[useBadgeCounts] ✅ Notification scheduled');
          } catch (error) {
            console.error('[useBadgeCounts] ❌ Failed to show local notification:', error);
            console.error('[useBadgeCounts] Error details:', error.message, error.stack);
          }
          
          // Increment count immediately for instant feedback
          setUnreadMessagesCount(prev => {
            const newCount = prev + 1;
            console.log('[useBadgeCounts] ⬆️ Badge count incremented:', prev, '->', newCount);
            return newCount;
          });
          // Then fetch actual count from server after a short delay
          setTimeout(() => {
            console.log('[useBadgeCounts] 🔄 Fetching actual count from server...');
            fetchCounts();
          }, 500);
        } else if (data.message && data.message.sender_type === 'parent') {
          console.log('[useBadgeCounts] Parent message (not counting for badge)');
          // If parent sent a message, just refresh count (shouldn't change, but ensures accuracy)
          setTimeout(() => {
            fetchCounts();
          }, 300);
        } else {
          console.log('[useBadgeCounts] ⚠️ Message data missing or invalid:', data);
        }
      },
    });

    return () => {
      if (channel) {
        console.log('[useBadgeCounts] Cleaning up Pusher listener');
        unsubscribeFromChannel(channel);
      }
    };
  }, [parent?.id, fetchCounts]);

  // Fetch counts on initial mount
  useEffect(() => {
    if (parent?.id) {
      fetchCounts();
    }
  }, [parent?.id, fetchCounts]);

  // Poll for unread messages and notifications every 1 second for instant SOS detection
  // Also check for queued notifications and force display them
  useEffect(() => {
    if (!parent?.id) return;

    const pollInterval = setInterval(async () => {
      console.log('[useBadgeCounts] Polling for unread messages and notifications...');
      fetchCounts();

      // CRITICAL: Check for queued notifications and force display them
      // This is a workaround for Expo Go queuing limitation
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (scheduled.length > 0) {
          console.warn('[useBadgeCounts] ⚠️ Found', scheduled.length, 'queued notifications - forcing display...');

          // Get the most recent notification
          const latestNotification = scheduled[0];
          console.log('[useBadgeCounts] Latest queued notification:', {
            id: latestNotification.identifier,
            title: latestNotification.content.title,
            trigger: latestNotification.trigger,
          });

          // If it's an SOS notification with trigger: null, it should display immediately
          // Cancel all and re-schedule to force display
          if (latestNotification.content.data?.type === 'sos' && latestNotification.trigger === null) {
            console.log('[useBadgeCounts] 🔄 Force displaying queued SOS notification...');
            await Notifications.cancelAllScheduledNotificationsAsync();

            // Re-schedule immediately
            await Notifications.scheduleNotificationAsync({
              content: latestNotification.content,
              trigger: null,
            });

            console.log('[useBadgeCounts] ✅ Re-scheduled queued SOS notification');
          }
        }
      } catch (checkError) {
        // Ignore errors
      }
    }, 1000); // Poll every 1 second for instant SOS alerts

    return () => clearInterval(pollInterval);
  }, [parent?.id, fetchCounts]);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
    }, [fetchCounts])
  );

  return {
    pendingRequestsCount,
    unreadNotificationsCount,
    unreadMessagesCount,
    refreshCounts: fetchCounts,
  };
};

