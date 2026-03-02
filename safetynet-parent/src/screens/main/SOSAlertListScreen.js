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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { sosService } from '../../services';
import theme from '../../utils/theme';

const SOSAlertListScreen = () => {
  const navigation = useNavigation();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'resolved'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch SOS alerts
   */
  const fetchAlerts = async () => {
    try {
      const status = filter === 'all' ? 'all' : filter;
      const response = await sosService.getAlerts(status);
      if (response && response.success) {
        // Normalize backend response structures:
        // - response.data may be an array
        // - or { alerts: [...] }
        // - or { data: [...] }
        let alertsList = [];
        if (Array.isArray(response.data)) {
          alertsList = response.data;
        } else if (response.data?.alerts && Array.isArray(response.data.alerts)) {
          alertsList = response.data.alerts;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          alertsList = response.data.data;
        }

        if (!Array.isArray(alertsList)) {
          alertsList = [];
        }

        // Sort: active alerts first, then by triggered_at descending
        const sorted = alertsList.slice().sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return new Date(b.triggered_at) - new Date(a.triggered_at);
        });
        setAlerts(sorted);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error('Error fetching SOS alerts:', error);
      Alert.alert('Error', 'Failed to load SOS alerts. Please try again.');
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
    fetchAlerts();
  }, [filter]);

  /**
   * Load data on mount and when filter changes
   */
  useEffect(() => {
    setLoading(true);
    fetchAlerts();
  }, [filter]);

  /**
   * Reload on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [filter])
  );

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
   * Format date time
   */
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return theme.colors.error;
      case 'acknowledged':
        return theme.colors.warning;
      case 'resolved':
        return theme.colors.success;
      default:
        return theme.colors.textMuted;
    }
  };

  /**
   * Get status text
   */
  const getStatusText = (status) => {
    if (!status || typeof status !== 'string') {
      return 'Unknown';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  /**
   * Handle alert press
   */
  const handleAlertPress = (alert) => {
    navigation.navigate('SOSAlertDetail', { alertId: alert.id });
  };

  /**
   * Get child name
   */
  const getChildName = (alert) => {
    return alert.child?.full_name || alert.child?.name || 'Unknown Child';
  };

  /**
   * Get location snippet
   */
  const getLocationSnippet = (alert) => {
    if (alert.address) {
      return alert.address.length > 50 ? alert.address.substring(0, 50) + '...' : alert.address;
    }
    if (alert.latitude && alert.longitude) {
      return `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`;
    }
    return 'Location not available';
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
          <ActivityIndicator size="large" color={theme.colors.error} />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </LinearGradient>
    );
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const otherAlerts = alerts.filter((a) => a.status !== 'active');

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({alerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active ({activeAlerts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'resolved' && styles.filterButtonActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text style={[styles.filterText, filter === 'resolved' && styles.filterTextActive]}>
            Resolved ({alerts.filter((a) => a.status === 'resolved').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.error} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Active Alerts Section */}
        {filter === 'all' && activeAlerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 Active Alerts</Text>
            {activeAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertCardActive}
                onPress={() => handleAlertPress(alert)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ff6b97', '#f7396c', '#e91e7d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.alertCardGradient}
                >
                  <View style={styles.alertCardContent}>
                    <View style={styles.alertCardLeft}>
                      <View style={styles.alertIcon}>
                        <Text style={styles.alertIconText}>🚨</Text>
                      </View>
                      <View style={styles.alertInfo}>
                        <Text style={styles.alertChildName}>{getChildName(alert)}</Text>
                        <Text style={styles.alertTime}>{getTimeAgo(alert.triggered_at)}</Text>
                        <Text style={styles.alertLocation} numberOfLines={1}>
                          📍 {getLocationSnippet(alert)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alertStatusContainer}>
                      <View style={[styles.alertStatusBadge, { backgroundColor: getStatusColor(alert.status) + '40' }]}>
                        <Text style={[styles.alertStatusText, { color: '#fff' }]}>
                          {getStatusText(alert.status)}
                        </Text>
                      </View>
                      <Text style={styles.alertArrow}>›</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Other Alerts */}
        {otherAlerts.length > 0 && (
          <View style={styles.section}>
            {filter === 'all' && <Text style={styles.sectionTitle}>Recent Alerts</Text>}
            {otherAlerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={styles.alertCard}
                onPress={() => handleAlertPress(alert)}
                activeOpacity={0.7}
              >
                <View style={styles.alertCardContent}>
                  <View style={styles.alertCardLeft}>
                    <View style={[styles.alertIcon, styles.alertIconInactive]}>
                      <Text style={styles.alertIconText}>🚨</Text>
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertChildName}>{getChildName(alert)}</Text>
                      <Text style={styles.alertTime}>{formatDateTime(alert.triggered_at)}</Text>
                      <Text style={styles.alertLocation} numberOfLines={1}>
                        📍 {getLocationSnippet(alert)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.alertStatusContainer}>
                    <View style={[styles.alertStatusBadge, { backgroundColor: getStatusColor(alert.status) + '20' }]}>
                      <Text style={[styles.alertStatusText, { color: getStatusColor(alert.status) }]}>
                        {getStatusText(alert.status)}
                      </Text>
                    </View>
                    <Text style={styles.alertArrow}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {alerts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚨</Text>
            <Text style={styles.emptyText}>No SOS alerts</Text>
            <Text style={styles.emptyHint}>
              {filter === 'active'
                ? 'No active alerts at this time'
                : filter === 'resolved'
                ? 'No resolved alerts'
                : 'No alerts found'}
            </Text>
          </View>
        )}

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
    paddingTop: theme.spacing.md,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#fff',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.error,
  },
  filterText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  filterTextActive: {
    color: theme.colors.textWhite,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  alertCardActive: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  alertCardGradient: {
    padding: theme.spacing.lg,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  alertCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertCardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  alertIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  alertIconInactive: {
    backgroundColor: theme.colors.backgroundLight,
  },
  alertIconText: {
    fontSize: 24,
  },
  alertInfo: {
    flex: 1,
  },
  alertChildName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.xs,
  },
  alertTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textWhite,
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  alertLocation: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textWhite,
    opacity: 0.8,
  },
  alertStatusContainer: {
    alignItems: 'flex-end',
  },
  alertStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xs,
  },
  alertStatusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
  },
  alertArrow: {
    fontSize: 24,
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.bold,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    marginTop: theme.spacing['2xl'],
    ...theme.shadows.sm,
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
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
});

export default SOSAlertListScreen;
