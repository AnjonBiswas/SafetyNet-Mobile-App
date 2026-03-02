import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import parentChildChatService from '../services/parentChildChatService';
import { subscribeToChildChannel, unsubscribeFromChannel } from '../services/pusherService';

/**
 * Hook to manage badge counts for tabs
 * Returns unread messages count
 */
export const useBadgeCounts = () => {
  const { user } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const previousUnreadCountRef = useRef(0);
  
  const fetchCounts = useCallback(async () => {
    try {
      // Fetch unread messages count
      const messagesRes = await parentChildChatService.getUnreadCount();
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
                title: `💬 New message from Parent`,
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
      console.error('[useBadgeCounts] Error fetching badge counts:', error);
    }
  }, []);

  // Listen for real-time message updates via Pusher
  useEffect(() => {
    if (!user?.id) return;

    console.log('[useBadgeCounts] Setting up Pusher listener for child:', user.id);

    const channel = subscribeToChildChannel(user.id, {
      onChatMessage: async (data) => {
        console.log('[useBadgeCounts] Pusher message received:', {
          hasMessage: !!data.message,
          senderType: data.message?.sender_type,
          parentId: data.message?.parent_id,
          messageId: data.message?.id,
        });

        // When a message is received, refresh the unread count
        // Only count messages from parents (not from child themselves)
        if (data.message && data.message.sender_type === 'parent') {
          console.log('[useBadgeCounts] ✅ Parent message detected, incrementing badge count');
          
          // Show local notification (works in Expo Go)
          try {
            const parentName = data.message.parent?.full_name || data.message.parent?.name || 'Parent';
            const messageText = data.message.message || 'New message';
            const preview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
            
            console.log('[useBadgeCounts] 📲 Scheduling notification for parent message:', {
              parentName,
              preview,
              messageId: data.message.id,
            });
            
            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `💬 New message from ${parentName}`,
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
        } else if (data.message && data.message.sender_type === 'child') {
          console.log('[useBadgeCounts] Child message (not counting for badge)');
          // If child sent a message, just refresh count (shouldn't change, but ensures accuracy)
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
  }, [user?.id, fetchCounts]);

  // Fetch counts on initial mount
  useEffect(() => {
    if (user?.id) {
      fetchCounts();
    }
  }, [user?.id, fetchCounts]);

  // Poll for unread messages every 5 seconds as a fallback
  useEffect(() => {
    if (!user?.id) return;
    
    const pollInterval = setInterval(() => {
      console.log('[useBadgeCounts] Polling for unread messages...');
      fetchCounts();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [user?.id, fetchCounts]);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
    }, [fetchCounts])
  );

  return {
    unreadMessagesCount,
    refreshCounts: fetchCounts,
  };
};
