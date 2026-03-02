import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { notificationService, sosService } from '../../services';
import { subscribeToParentChannel, unsubscribeFromChannel } from '../../services/pusherService';
import { useAuth } from '../../context/AuthContext';
import { useBadgeCounts } from '../../hooks/useBadgeCounts';
import theme from '../../utils/theme';
import { formatRelativeTime, groupNotificationsByDate } from '../../utils/helpers';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { parent } = useAuth();
  const { refreshCounts } = useBadgeCounts();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'sos', 'geofence', 'battery', 'checkin', 'link_request'
  const [unreadCount, setUnreadCount] = useState(0);
  const [processingIds, setProcessingIds] = useState(new Set());
  const swipeableRefs = React.useRef({});
  const [selectedSosNotification, setSelectedSosNotification] = useState(null);
  const [sosPreviewVisible, setSosPreviewVisible] = useState(false);
  const [sosPreviewLoading, setSosPreviewLoading] = useState(false);

  /**
   * Get notification icon and color based on type
   */
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'sos':
        return { icon: 'alert-circle', color: theme.colors.error };
      case 'geofence':
        return { icon: 'map-marker-radius', color: theme.colors.blue };
      case 'battery':
        return { icon: 'battery-alert', color: theme.colors.warning };
      case 'checkin':
        return { icon: 'check-circle', color: theme.colors.success };
      case 'link_request':
        return { icon: 'link-variant', color: theme.colors.textMuted };
      default:
        return { icon: 'bell', color: theme.colors.textMuted };
    }
  };

  /**
   * Get notification emoji based on type
   */
  const getNotificationEmoji = (type) => {
    switch (type) {
      case 'sos':
        return '🚨';
      case 'geofence':
        return '📍';
      case 'battery':
        return '🔋';
      case 'checkin':
        return '✅';
      case 'link_request':
        return '🔗';
      default:
        return '🔔';
    }
  };

  /**
   * Fetch notifications
   */
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const filter = filterType !== 'all' ? { type: filterType } : {};

      // Fetch notifications and unread count in parallel
      const [listResponse, countResponse] = await Promise.all([
        notificationService.getNotifications(filter),
        notificationService.getUnreadCount(),
      ]);

      if (listResponse?.success) {
        let notificationList = [];
        if (Array.isArray(listResponse.data)) {
          notificationList = listResponse.data;
        } else if (listResponse.data?.notifications && Array.isArray(listResponse.data.notifications)) {
          notificationList = listResponse.data.notifications;
        } else if (listResponse.data?.data && Array.isArray(listResponse.data.data)) {
          notificationList = listResponse.data.data;
        }

        const sorted = Array.isArray(notificationList)
          ? notificationList.slice().sort((a, b) => {
              const timeA = new Date(a.created_at || a.createdAt || 0);
              const timeB = new Date(b.created_at || b.createdAt || 0);
              return timeB - timeA;
            })
          : [];
        setNotifications(sorted);
        applyFilter(sorted);
      } else {
        setNotifications([]);
        setFilteredNotifications([]);
      }

      if (countResponse?.success) {
        setUnreadCount(countResponse.data?.count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Apply filter to notifications
   */
  const applyFilter = (notificationList) => {
    if (filterType === 'all') {
      setFilteredNotifications(notificationList);
    } else {
      const filtered = notificationList.filter((n) => n.type === filterType);
      setFilteredNotifications(filtered);
    }
  };

  /**
   * Handle filter change
   */
  useEffect(() => {
    applyFilter(notifications);
  }, [filterType]);

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      // Refresh badge count when screen is focused
      refreshCounts();
    }, [filterType, refreshCounts])
  );

  /**
   * Setup real-time notifications
   */
  useEffect(() => {
    let parentChannel;
    if (parent?.id) {
      parentChannel = subscribeToParentChannel(parent.id, {
        onNotification: async (data) => {
          console.log('New notification received:', data);
          // Add new notification to the top of the list
          if (data.notification) {
            setNotifications((prev) => [data.notification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Trigger local push notification
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: data.notification.title || 'New Notification',
                  body: data.notification.message || 'You have a new notification',
                  data: {
                    type: data.notification.type,
                    child_id: data.notification.child_id,
                    sos_alert_id: data.notification.sos_alert_id || data.notification.data?.alert_id,
                    ...data.notification.data,
                  },
                  sound: true,
                  priority: data.notification.type === 'sos' ? 'max' : 'default',
                },
                trigger: null, // Show immediately
              });
            } catch (error) {
              console.warn('Failed to show push notification:', error);
            }
          }
        },
      });
    }

    return () => {
      if (parentChannel) {
        unsubscribeFromChannel(parentChannel);
      }
    };
  }, [parent?.id]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [filterType]);

  /**
   * Handle notification tap
   */
  const handleNotificationTap = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // For SOS: show a floating preview window instead of navigating away
    if (notification.type === 'sos') {
      setSelectedSosNotification(notification);
      setSosPreviewVisible(true);
      return;
    }

    // Navigate based on notification type (non-SOS)
    switch (notification.type) {
      case 'geofence': {
        // Open geofences screen in Children tab
        navigation.navigate('ChildrenTab', {
          screen: 'Geofences',
        });
        break;
      }
      case 'link_request': {
        // Open children screen focused on link requests
        navigation.navigate('ChildrenTab', {
          screen: 'Children',
          params: { initialTab: 'requests' },
        });
        break;
      }
      case 'checkin': {
        // Open specific child detail when possible
        if (notification.child_id) {
          navigation.navigate('ChildrenTab', {
            screen: 'ChildDetail',
            params: { childId: notification.child_id },
          });
        } else {
          navigation.navigate('ChildrenTab', {
            screen: 'ChildrenList',
          });
        }
        break;
      }
      case 'battery': {
        // Open specific child detail when possible
        if (notification.child_id) {
          navigation.navigate('ChildrenTab', {
            screen: 'ChildDetail',
            params: { childId: notification.child_id },
          });
        } else {
          navigation.navigate('ChildrenTab', {
            screen: 'ChildrenList',
          });
        }
        break;
      }
      default:
        // For unknown types, just stay on notifications
        break;
    }
  };

  /**
   * Handle mark as read
   */
  const handleMarkAsRead = async (id) => {
    if (processingIds.has(id)) return;

    try {
      setProcessingIds((prev) => new Set([...prev, id]));
      const response = await notificationService.markAsRead(id);
      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setFilteredNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        // Refresh badge count to update navigation badge
        refreshCounts();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setFilteredNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        // Refresh badge count to update navigation badge
        refreshCounts();
        Alert.alert('Success', 'All notifications marked as read');
      } else {
        Alert.alert('Error', response.message || 'Failed to mark all as read');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all as read. Please try again.');
    }
  };

  /**
   * Handle delete notification
   */
  const handleDelete = async (id) => {
    // Close swipeable first
    if (swipeableRefs.current[id]) {
      swipeableRefs.current[id].close();
    }

    try {
      const response = await notificationService.deleteNotification(id);
      if (response.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setFilteredNotifications((prev) => prev.filter((n) => n.id !== id));
        if (!notifications.find((n) => n.id === id)?.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        // Refresh badge count to update navigation badge
        refreshCounts();
      } else {
        Alert.alert('Error', response.message || 'Failed to delete notification');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notification. Please try again.');
    }
  };

  /**
   * Handle clear all
   */
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all notifications one by one
              const deletePromises = filteredNotifications.map((n) =>
                notificationService.deleteNotification(n.id)
              );
              await Promise.all(deletePromises);
              setNotifications([]);
              setFilteredNotifications([]);
              setUnreadCount(0);
              // Refresh badge count to update navigation badge
              refreshCounts();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear all notifications. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Render swipeable delete action
   */
  const renderRightActions = (notification) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(notification.id)}
        activeOpacity={0.7}
      >
        <Icon name="delete" size={24} color={theme.colors.textWhite} />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render notification item
   */
  const renderNotificationItem = ({ item: notification }) => {
    const iconData = getNotificationIcon(notification.type);
    const emoji = getNotificationEmoji(notification.type);

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current[notification.id] = ref;
          }
        }}
        renderRightActions={() => renderRightActions(notification)}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.notificationItem, !notification.is_read && styles.notificationItemUnread]}
          onPress={() => handleNotificationTap(notification)}
          activeOpacity={0.7}
        >
          <View style={styles.notificationIconContainer}>
            <View style={[styles.notificationIcon, { backgroundColor: `${iconData.color}20` }]}>
              <Text style={styles.notificationEmoji}>{emoji}</Text>
            </View>
            {!notification.is_read && <View style={styles.unreadDot} />}
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle} numberOfLines={1}>
                {notification.title || 'Notification'}
              </Text>
              <Text style={styles.notificationTime}>
                {formatRelativeTime(notification.created_at)}
              </Text>
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message || 'No message'}
            </Text>
            {notification.child && (
              <Text style={styles.notificationChild}>
                👤 {notification.child.full_name || notification.child.name}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  /**
   * Render section header
   */
  const renderSectionHeader = ({ section }) => {
    if (section.data.length === 0) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    );
  };

  /**
   * Group notifications by date
   */
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);
  const sections = [
    { title: 'Today', data: groupedNotifications.today },
    { title: 'Yesterday', data: groupedNotifications.yesterday },
    { title: 'Earlier', data: groupedNotifications.earlier },
  ].filter((section) => section.data.length > 0);

  if (loading && notifications.length === 0) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        {/* Header with Filters */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {/* Filter Buttons */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filters}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'sos' && styles.filterButtonActive]}
              onPress={() => setFilterType('sos')}
            >
              <Text style={[styles.filterText, filterType === 'sos' && styles.filterTextActive]}>
                🚨 SOS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'geofence' && styles.filterButtonActive]}
              onPress={() => setFilterType('geofence')}
            >
              <Text style={[styles.filterText, filterType === 'geofence' && styles.filterTextActive]}>
                📍 Geofence
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'battery' && styles.filterButtonActive]}
              onPress={() => setFilterType('battery')}
            >
              <Text style={[styles.filterText, filterType === 'battery' && styles.filterTextActive]}>
                🔋 Battery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'checkin' && styles.filterButtonActive]}
              onPress={() => setFilterType('checkin')}
            >
              <Text style={[styles.filterText, filterType === 'checkin' && styles.filterTextActive]}>
                ✅ Check-in
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'link_request' && styles.filterButtonActive]}
              onPress={() => setFilterType('link_request')}
            >
              <Text style={[styles.filterText, filterType === 'link_request' && styles.filterTextActive]}>
                🔗 Links
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Action Buttons */}
          {filteredNotifications.length > 0 && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleMarkAllAsRead}>
                <Icon name="check-all" size={20} color={theme.colors.primary} />
                <Text style={styles.actionButtonText}>Mark All Read</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
                <Icon name="delete-sweep" size={20} color={theme.colors.error} />
                <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptyHint}>
              {filterType === 'all'
                ? "You're all caught up! New notifications will appear here."
                : `No ${filterType} notifications found.`}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderNotificationItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        )}
      </LinearGradient>

      {/* Floating SOS preview window */}
      <Modal
        visible={sosPreviewVisible && !!selectedSosNotification}
        transparent
        animationType="fade"
        onRequestClose={() => setSosPreviewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>🚨 SOS Alert</Text>
            <Text style={styles.modalChildName}>
              {selectedSosNotification?.child?.full_name ||
                selectedSosNotification?.child?.name ||
                'Your child'}
            </Text>
            <Text style={styles.modalMessage}>
              {selectedSosNotification?.message ||
                'An SOS alert was triggered. A short emergency video was recorded on the child device.'}
            </Text>
            <Text style={styles.modalTime}>
              {formatRelativeTime(selectedSosNotification?.created_at)}
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setSosPreviewVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={async () => {
                  if (!selectedSosNotification) return;

                  try {
                    setSosPreviewLoading(true);

                    // Try to resolve childId from multiple possible fields
                    let childId =
                      selectedSosNotification.child_id ||
                      selectedSosNotification.child?.id ||
                      selectedSosNotification.data?.child_id;

                    // If still missing but we have an alert id, fetch alert detail to get child_id
                    const alertId =
                      selectedSosNotification.sos_alert_id ||
                      selectedSosNotification.data?.alert_id ||
                      selectedSosNotification.data?.alertId;

                    if (!childId && alertId) {
                      try {
                        const detailRes = await sosService.getAlertDetail(alertId);
                        if (detailRes?.success && detailRes.data?.child_id) {
                          childId = detailRes.data.child_id;
                        }
                      } catch (e) {
                        // Silent: we'll handle missing childId below
                      }
                    }

                    if (childId) {
                      setSosPreviewVisible(false);
                      navigation.navigate('ChildrenTab', {
                        screen: 'ChildDetail',
                        params: {
                          childId,
                          fromAlertId: alertId || null,
                          initialTab: 'videos',
                        },
                      });
                    } else {
                      Alert.alert(
                        'Info',
                        'Could not find the child linked to this SOS alert. Please open the child detail screen manually.'
                      );
                    }
                  } finally {
                    setSosPreviewLoading(false);
                  }
                }}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {sosPreviewLoading ? 'Opening…' : '▶ View SOS Video'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    minWidth: 24,
    height: 24,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
  },
  filters: {
    marginBottom: theme.spacing.md,
  },
  filtersContent: {
    gap: theme.spacing.sm,
  },
  filterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#fff',
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  filterTextActive: {
    color: theme.colors.textWhite,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#fff',
    ...theme.shadows.sm,
  },
  actionButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.primary,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['5xl'],
  },
  sectionHeader: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sectionHeaderText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  notificationItemUnread: {
    backgroundColor: theme.colors.backgroundLight,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  notificationIconContainer: {
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationEmoji: {
    fontSize: 24,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  notificationTitle: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginRight: theme.spacing.sm,
  },
  notificationTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    flexShrink: 0,
  },
  notificationMessage: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  notificationChild: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  deleteActionText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  emptyHint: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    borderRadius: theme.borderRadius['2xl'],
    backgroundColor: '#fff',
    padding: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  modalChildName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  modalMessage: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  modalTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  modalButtonSecondary: {
    backgroundColor: theme.colors.backgroundLight,
  },
  modalButtonSecondaryText: {
    color: theme.colors.textDark,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonPrimaryText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default NotificationsScreen;
