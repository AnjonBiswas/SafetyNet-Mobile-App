import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { childrenService, sosService, notificationService } from '../../services';
import { useBadgeCounts } from '../../hooks/useBadgeCounts';
import useRealtime from '../../hooks/useRealtime';
import theme from '../../utils/theme';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { parent } = useAuth();
  const { unreadNotificationsCount, refreshCounts } = useBadgeCounts();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState([]);
  const [activeSosAlerts, setActiveSosAlerts] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [childrenLocations, setChildrenLocations] = useState({});
  const [locationsLoading, setLocationsLoading] = useState(false);

  /**
   * Fetch location for a single child
   */
  const fetchChildLocation = async (childId) => {
    if (!childId) return null;

    try {
      console.log(`[Location] Fetching location for child ${childId}...`);
      const response = await childrenService.getChildLocation(childId);
      console.log(`[Location] Response for child ${childId}:`, JSON.stringify(response, null, 2));

      if (response && response.success && response.data && response.data.location) {
        const location = response.data.location;

        // Convert latitude and longitude to numbers if they're strings
        const latitude = typeof location.latitude === 'string'
          ? parseFloat(location.latitude)
          : location.latitude;
        const longitude = typeof location.longitude === 'string'
          ? parseFloat(location.longitude)
          : location.longitude;

        // Validate coordinates are valid numbers
        if (latitude !== null && latitude !== undefined && !isNaN(latitude) &&
          longitude !== null && longitude !== undefined && !isNaN(longitude)) {
          // Create normalized location object with numbers
          const normalizedLocation = {
            ...location,
            latitude: latitude,
            longitude: longitude,
          };
          console.log(`[Location] ✅ Valid location for child ${childId}:`, normalizedLocation);
          return { childId, location: normalizedLocation };
        } else {
          console.log(`[Location] ⚠️ Location missing valid coordinates for child ${childId}`);
          return null;
        }
      } else {
        console.log(`[Location] ⚠️ No location data in response for child ${childId}`);
        return null;
      }
    } catch (error) {
      console.error(`[Location] ❌ Error fetching location for child ${childId}:`, error);
      console.error(`[Location] Error details:`, error.response?.data || error.message);
      return null;
    }
  };

  /**
   * Fetch locations for all children
   */
  const fetchAllChildrenLocations = useCallback(async (childrenList) => {
    if (!Array.isArray(childrenList) || childrenList.length === 0) {
      console.log('[Location] No children to fetch locations for');
      setChildrenLocations({});
      return;
    }

    console.log(`[Location] ========== Starting location fetch for ${childrenList.length} children ==========`);
    setLocationsLoading(true);

    try {
      const locationPromises = childrenList.map(async (child) => {
        const childId = child.child?.id || child.child_id || child.id;
        if (!childId) {
          console.warn('[Location] Child ID not found:', child);
          return null;
        }
        return await fetchChildLocation(childId);
      });

      const results = await Promise.all(locationPromises);
      console.log(`[Location] All location promises resolved. Results:`, JSON.stringify(results, null, 2));

      const locationMap = {};
      results.forEach((result) => {
        if (result && result.childId && result.location) {
          locationMap[result.childId] = result.location;
          console.log(`[Location] ✅ Stored location for child ${result.childId}`);
        }
      });

      console.log(`[Location] Final location map:`, JSON.stringify(locationMap, null, 2));
      console.log(`[Location] Location keys:`, Object.keys(locationMap));
      setChildrenLocations(locationMap);
      console.log(`[Location] ========== Location fetch completed ==========`);
    } catch (error) {
      console.error('[Location] Error in fetchAllChildrenLocations:', error);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  /**
   * Fetch all dashboard data
   */
  const fetchDashboardData = async () => {
    try {
      console.log('🚀 Dashboard: ========== fetchDashboardData STARTED ==========');
      setLoading(true);
      // Fetch core dashboard data in parallel for speed
      const [childrenResponse, sosResponse, notificationsResponse, unreadResponse] =
        await Promise.all([
          childrenService.getChildren(),
          sosService.getAlerts('active'),
          notificationService.getNotifications({ limit: 5 }),
          notificationService.getUnreadCount(),
        ]);

      // Children + locations
      if (childrenResponse && childrenResponse.success) {
        let childrenList = [];
        if (childrenResponse.data?.children && Array.isArray(childrenResponse.data.children)) {
          childrenList = childrenResponse.data.children;
        } else if (Array.isArray(childrenResponse.data)) {
          childrenList = childrenResponse.data;
        } else if (childrenResponse.data?.data && Array.isArray(childrenResponse.data.data)) {
          childrenList = childrenResponse.data.data;
        }
        setChildren(childrenList);
        // Fetch locations in background (don't block main loading)
        fetchAllChildrenLocations(childrenList);
      } else {
        setChildren([]);
        setChildrenLocations({});
      }

      // Active SOS alerts
      if (sosResponse?.success) {
        setActiveSosAlerts(sosResponse.data || []);
      } else {
        setActiveSosAlerts([]);
      }

      // Recent notifications
      if (notificationsResponse?.success) {
        setRecentNotifications(notificationsResponse.data || []);
      } else {
        setRecentNotifications([]);
      }

      // Unread count - now managed by useBadgeCounts hook
      // Just refresh the hook's count instead of setting local state
      refreshCounts();
    } catch (error) {
      console.error('Dashboard: Error fetching dashboard data:', error);
      console.error('Dashboard: Error details:', error.response?.data || error.message || error);

      // Handle network errors with more helpful messages
      if (error?.isNetworkError) {
        const errorMessage = error.message || 'Network error occurred';
        Alert.alert(
          'Connection Error',
          errorMessage,
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Retry',
              onPress: () => fetchDashboardData(),
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  // Realtime subscriptions: SOS alerts, child location, geofence events, child status
  useRealtime({
    onSosTriggered: async (data) => {
      console.log('[Dashboard] SOS triggered event received:', JSON.stringify(data, null, 2));
      if (!data?.alert) {
        console.warn('[Dashboard] SOS event missing alert data:', data);
        return;
      }
      
      const alert = data.alert;
      console.log('[Dashboard] Processing SOS alert:', alert.id, 'for child:', alert.child_id);
      
      setActiveSosAlerts((prev) => {
        const exists = prev.find((a) => a.id === alert.id);
        if (!exists) {
          console.log('[Dashboard] Adding new SOS alert to list');
          return [alert, ...prev];
        }
        console.log('[Dashboard] SOS alert already exists in list');
        return prev;
      });
      
      // Refresh unread count
      notificationService.getUnreadCount().then((res) => {
        if (res.success) {
          setUnreadCount(res.data?.count || 0);
        }
      });
      
      // Trigger local push notification for SOS alerts
      try {
        const childName = alert.child_name || alert.child?.full_name || alert.child?.name || 'Child';
        const notificationTitle = '🚨 SOS ALERT';
        const notificationBody = `${childName} has triggered an SOS alert`;
        
        console.log('[Dashboard] Scheduling push notification:', notificationTitle, notificationBody);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notificationTitle,
            body: notificationBody,
            data: {
              type: 'sos',
              alert_id: alert.id,
              child_id: alert.child_id,
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null, // Show immediately
        });
        
        console.log('[Dashboard] Push notification scheduled successfully');
      } catch (error) {
        console.error('[Dashboard] Failed to show SOS push notification:', error);
        console.error('[Dashboard] Error details:', error.message, error.stack);
      }
    },
    onLocationUpdated: (data) => {
      const childId = data.child_id || data.child?.id;
      console.log('Dashboard: Realtime location update:', JSON.stringify(data, null, 2));
      if (childId) {
        // Extract location from realtime data
        const location = data.location || data;
        if (location && location.latitude && location.longitude) {
          setChildrenLocations((prev) => ({
            ...prev,
            [childId]: location,
          }));
          console.log(`Dashboard: Updated location for child ${childId}:`, location);
        }
      }
    },
    onGeofenceEvent: () => {
      // For geofence events, refresh dashboard snippets
      fetchDashboardData();
    },
    onChildStatusChanged: (data) => {
      const childId = data?.child_id || data?.child?.id;
      if (!childId) return;
      setChildren((prev) =>
        prev.map((c) => {
          const cId = c.child?.id || c.child_id || c.id;
          return cId === childId ? { ...c, status: data.status || c.status } : c;
        })
      );
    },
  });

  /**
   * Fetch locations when children change
   */
  useEffect(() => {
    if (Array.isArray(children) && children.length > 0) {
      console.log('[Location] Children changed, fetching locations...', children.length);
      fetchAllChildrenLocations(children);
    } else {
      console.log('[Location] No children, clearing locations');
      setChildrenLocations({});
    }
  }, [children, fetchAllChildrenLocations]);

  /**
   * Load data on mount and when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      // Refresh badge count when screen is focused
      refreshCounts();
    }, [refreshCounts])
  );
  
  // Sync unreadCount with badge count from hook
  useEffect(() => {
    setUnreadCount(unreadNotificationsCount);
  }, [unreadNotificationsCount]);

  /**
   * Debug: Log when childrenLocations state changes
   */
  useEffect(() => {
    console.log('[Location] State changed:', JSON.stringify(childrenLocations, null, 2));
    console.log('[Location] Keys:', Object.keys(childrenLocations));
  }, [childrenLocations]);

  /**
   * Format time ago
   */
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  /**
   * Get child initials
   */
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Handle SOS alert press
   */
  const handleSosPress = (alert) => {
    navigation.navigate('AlertsTab', {
      screen: 'SOSAlertDetail',
      params: { alertId: alert.id },
    });
  };

  /**
   * Handle child card press
   */
  const handleChildPress = (child) => {
    const childId = child.child?.id || child.child_id || child.id;
    if (!childId) {
      Alert.alert('Error', 'Child ID is missing');
      return;
    }
    navigation.navigate('ChildrenTab', {
      screen: 'ChildDetail',
      params: { childId },
    });
  };

  /**
   * Handle quick locate
   */
  const handleQuickLocate = (childId, e) => {
    e.stopPropagation();
    navigation.navigate('ChildrenTab', {
      screen: 'LiveTracking',
      params: { childId },
    });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>SN</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>
                Welcome, {parent?.name?.split(' ')[0] || 'Parent'} 👋
              </Text>
              <Text style={styles.subGreeting}>Monitor your children's safety</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate('NotificationsTab')}
            activeOpacity={0.7}
          >
            <Image
              // NOTE: Make sure this file exists in the parent app:
              // Copy SafetyNet-mobile/assets/Notification.png -> safetynet-parent/assets/Notification.png
              // DashboardScreen is in src/screens/main, so go three levels up.
              source={require('../../../assets/Notification.png')}
              style={styles.bellIcon}
              resizeMode="contain"
            />
            {unreadCount > 0 && (
              <>
                {/* Simple dot indicator */}
                <View style={styles.badgeDot} />
                {/* Count badge */}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Active SOS Alerts Section */}
        {activeSosAlerts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, styles.sosTitle]}>⚠️ Active SOS Alerts</Text>
            </View>
            {activeSosAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={styles.sosCard}
                onPress={() => handleSosPress(alert)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ff6b97', '#f7396c', '#e91e7d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sosCardGradient}
                >
                  <View style={styles.sosCardContent}>
                    <View style={styles.sosCardLeft}>
                      <Text style={styles.sosAlertText}>🚨 SOS ALERT</Text>
                      <Text style={styles.sosChildName}>
                        {alert.child?.full_name || alert.child?.name || 'Child'}
                      </Text>
                      <Text style={styles.sosTime}>
                        {getTimeAgo(alert.triggered_at)}
                      </Text>
                    </View>
                    <Text style={styles.sosArrow}>›</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Children Overview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>👶 My Children</Text>
              {children.length > 0 && (
                <View style={styles.childrenCountBadge}>
                  <Text style={styles.childrenCountText}>{children.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ChildrenTab')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {children.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👶</Text>
              <Text style={styles.emptyText}>No children linked yet</Text>
              <Text style={styles.emptyHint}>Link a child to start monitoring</Text>
              <TouchableOpacity
                style={styles.addChildButton}
                onPress={() => navigation.navigate('LinkChild')}
              >
                <Text style={styles.addChildButtonText}>+ Link Child</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Array.isArray(children) && children.length > 0 ? children.map((child) => {
              const childId = child.child?.id || child.child_id || child.id;
              const location = childrenLocations[childId];
              // Backend returns child.name (not full_name) in the nested structure
              const childName = child.child?.name || child.child?.full_name || child.name || 'Unknown';

              // Use child.is_active from backend (boolean) instead of child.status
              const isActive = child.child?.is_active ?? child.is_active ?? false;
              const status = isActive ? 'Active' : 'Inactive';

              return (
                <TouchableOpacity
                  key={childId}
                  style={styles.childCard}
                  onPress={() => handleChildPress(child)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isActive ? ['#FFFFFF', '#F8F9FF', '#F0F4FF'] : ['#FFFFFF', '#F8F8F8', '#F0F0F0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.childCardGradient}
                  >
                    <View style={styles.childCardContent}>
                      <View style={styles.childCardLeft}>
                        <View style={[
                          styles.childAvatar,
                          isActive && styles.childAvatarActive
                        ]}>
                          <Text style={styles.childInitials}>{getInitials(childName)}</Text>
                          <View
                            style={[
                              styles.statusDot,
                              isActive ? styles.statusDotActive : styles.statusDotInactive,
                            ]}
                          />
                        </View>
                        <View style={styles.childInfo}>
                          <View style={styles.childNameRow}>
                            <Text style={styles.childName}>{childName}</Text>
                            <View style={[
                              styles.statusBadge,
                              isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
                            ]}>
                              <View style={[
                                styles.statusBadgeDot,
                                isActive ? styles.statusBadgeDotActive : styles.statusBadgeDotInactive
                              ]} />
                              <Text style={[
                                styles.statusBadgeText,
                                isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive
                              ]}>
                                {status}
                              </Text>
                            </View>
                          </View>
                          {locationsLoading ? (
                            <View style={styles.childLocationContainer}>
                              <Text style={styles.childNoLocation}>Loading location...</Text>
                            </View>
                          ) : location && location.latitude !== null && location.latitude !== undefined &&
                            location.longitude !== null && location.longitude !== undefined &&
                            !isNaN(Number(location.latitude)) && !isNaN(Number(location.longitude)) ? (
                            <>
                              <View style={styles.childLocationContainer}>
                                <Text style={styles.locationIcon}>📍</Text>
                                <Text style={styles.childLocation} numberOfLines={1}>
                                  {location.address || `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`}
                                </Text>
                              </View>
                              <View style={styles.childMetaRow}>
                                <View style={styles.metaItem}>
                                  <Text style={styles.metaIcon}>🕐</Text>
                                  <Text style={styles.childTime}>
                                    {getTimeAgo(location.recorded_at || location.updated_at || location.age)}
                                  </Text>
                                </View>
                                {location.battery_level !== null && location.battery_level !== undefined && (
                                  <View style={styles.metaItem}>
                                    <Text style={styles.metaIcon}>🔋</Text>
                                    <Text style={[
                                      styles.childBattery,
                                      location.battery_level < 20 && styles.childBatteryLow
                                    ]}>
                                      {location.battery_level}%
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </>
                          ) : (
                            <View style={styles.childLocationContainer}>
                              <Text style={styles.childNoLocation}>No location data available</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.locateButton,
                          isActive && styles.locateButtonActive
                        ]}
                        onPress={(e) => handleQuickLocate(childId, e)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.locateButtonText}>📍</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }) : null
          )}
        </View>

        {/* Recent Activity Section */}
        {(recentNotifications.length > 0 || activeSosAlerts.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('NotificationsTab')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentNotifications.slice(0, 3).map((notification) => (
              <View key={notification.id} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Text style={styles.activityIconText}>
                    {notification.type === 'sos' ? '🚨' : notification.type === 'geofence' ? '📍' : '🔔'}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{notification.title}</Text>
                  <Text style={styles.activityMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.activityTime}>
                    {getTimeAgo(notification.created_at)}
                  </Text>
                </View>
                {!notification.is_read && <View style={styles.unreadDot} />}
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#E6F6E6' }]}
              onPress={() => navigation.navigate('LinkChild')}
            >
              <Text style={styles.quickActionIcon}>➕</Text>
              <Text style={styles.quickActionLabel}>Add Child</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#FFF7D9' }]}
              onPress={() => navigation.navigate('ChildrenTab')}
            >
              <Text style={styles.quickActionIcon}>👥</Text>
              <Text style={styles.quickActionLabel}>All Children</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: '#FFE4E1' }]}
              onPress={() => navigation.navigate('AlertsTab')}
            >
              <Text style={styles.quickActionIcon}>🚨</Text>
              <Text style={styles.quickActionLabel}>All Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing['5xl'],
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    ...theme.shadows.md,
  },
  logoText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  subGreeting: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
    position: 'relative',
  },
  bellIcon: {
    width: 22,
    height: 22,
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
  },
  section: {
    marginTop: theme.spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  childrenCountBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
  },
  childrenCountText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
  },
  sosTitle: {
    color: theme.colors.error,
  },
  viewAllButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.bold,
  },
  sosCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  sosCardGradient: {
    padding: theme.spacing.lg,
  },
  sosCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sosCardLeft: {
    flex: 1,
  },
  sosAlertText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  sosChildName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.xs,
  },
  sosTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textWhite,
    opacity: 0.9,
  },
  sosArrow: {
    fontSize: 28,
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.bold,
  },
  childCard: {
    borderRadius: 20,
    marginTop: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 151, 0.1)',
  },
  childCardGradient: {
    padding: theme.spacing.xl,
    paddingVertical: theme.spacing['2xl'],
  },
  childCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childCardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  childAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.md,
  },
  childAvatarActive: {
    backgroundColor: '#BBDEFB',
    borderColor: '#90CAF9',
  },
  childInitials: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  statusDot: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.sm,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusDotInactive: {
    backgroundColor: theme.colors.textMuted,
  },
  childInfo: {
    flex: 1,
  },
  childNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  childName: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeInactive: {
    backgroundColor: '#F5F5F5',
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeDotInactive: {
    backgroundColor: theme.colors.textMuted,
  },
  statusBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
  },
  statusBadgeTextActive: {
    color: '#2E7D32',
  },
  statusBadgeTextInactive: {
    color: theme.colors.textMuted,
  },
  childLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  locationIcon: {
    fontSize: 16,
  },
  childLocation: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
    flex: 1,
  },
  childMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  childTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  childBattery: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  childBatteryLow: {
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.bold,
  },
  childNoLocation: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  locateButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB74D',
    ...theme.shadows.md,
  },
  locateButtonActive: {
    backgroundColor: '#FFE0B2',
    borderColor: '#FF9800',
  },
  locateButtonText: {
    fontSize: 24,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.sm,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  emptyHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  addChildButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
  },
  addChildButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  activityMessage: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: theme.spacing.sm,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  quickActionLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
});

export default DashboardScreen;
