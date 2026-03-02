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
import { childrenService } from '../../services';
import theme from '../../utils/theme';

const ChildrenListScreen = ({ navigation }) => {
  const nav = useNavigation();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [childrenLocations, setChildrenLocations] = useState({});
  const [locationsLoading, setLocationsLoading] = useState(false);

  /**
   * Fetch location for a single child
   */
  const fetchChildLocation = async (childId) => {
    if (!childId) return null;
    
    try {
      const response = await childrenService.getChildLocation(childId);
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
          return { childId, location: normalizedLocation };
        }
      }
      return null;
    } catch (error) {
      console.error(`[ChildrenList] Error fetching location for child ${childId}:`, error);
      return null;
    }
  };

  /**
   * Fetch locations for all children
   */
  const fetchAllChildrenLocations = useCallback(async (childrenList) => {
    if (!Array.isArray(childrenList) || childrenList.length === 0) {
      setChildrenLocations({});
      return;
    }

    setLocationsLoading(true);
    try {
      const locationPromises = childrenList.map(async (child) => {
        const childId = child.child?.id || child.child_id || child.id;
        return childId ? await fetchChildLocation(childId) : null;
      });

      const results = await Promise.all(locationPromises);
      const locationMap = {};
      results.forEach((result) => {
        if (result && result.childId && result.location) {
          locationMap[result.childId] = result.location;
        }
      });
      setChildrenLocations(locationMap);
    } catch (error) {
      console.error('[ChildrenList] Error fetching locations:', error);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  /**
   * Fetch children list
   */
  const fetchChildren = async () => {
    try {
      const response = await childrenService.getChildren();
      
      if (response.success) {
        // Backend returns: { success: true, data: { children: [...], count: ... } }
        let childrenList = [];
        
        // Extract children array from nested structure
        if (response.data?.children && Array.isArray(response.data.children)) {
          childrenList = response.data.children;
        } else if (Array.isArray(response.data)) {
          childrenList = response.data;
        } else {
          childrenList = [];
        }
        
        setChildren(childrenList);
        // Fetch locations separately
        await fetchAllChildrenLocations(childrenList);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      Alert.alert('Error', 'Failed to load children. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Fetch locations when children change
   */
  useEffect(() => {
    if (Array.isArray(children) && children.length > 0) {
      fetchAllChildrenLocations(children);
    } else {
      setChildrenLocations({});
    }
  }, [children, fetchAllChildrenLocations]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren();
  }, []);

  /**
   * Load data on mount and when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchChildren();
    }, [])
  );

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
   * Handle child press
   */
  const handleChildPress = (child) => {
    const childId = child.child?.id || child.child_id || child.id;
    if (!childId) {
      Alert.alert('Error', 'Child ID is missing');
      return;
    }
    nav.navigate('ChildrenTab', {
      screen: 'ChildDetail',
      params: { childId },
    });
  };

  /**
   * Handle add child press
   */
  const handleAddChild = () => {
    nav.navigate('LinkChild');
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
          <Text style={styles.loadingText}>Loading children...</Text>
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Children</Text>
          <Text style={styles.headerSubtitle}>
            {children.length} {children.length === 1 ? 'child' : 'children'} linked
          </Text>
        </View>

        {/* Children List */}
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={styles.emptyText}>No children linked yet</Text>
            <Text style={styles.emptyHint}>
              Link a child account to start monitoring their safety
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddChild}>
              <Text style={styles.addButtonText}>+ Link Child</Text>
            </TouchableOpacity>
          </View>
        ) : (
          children.map((child) => {
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
                activeOpacity={0.7}
              >
                <View style={styles.childCardContent}>
                  <View style={styles.childCardLeft}>
                    <View style={styles.childAvatar}>
                      <Text style={styles.childInitials}>{getInitials(childName)}</Text>
                      <View
                        style={[
                          styles.statusDot,
                          isActive ? styles.statusDotActive : styles.statusDotPending,
                        ]}
                      />
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{childName}</Text>
                      <View style={styles.childStatusRow}>
                        <Text
                          style={[
                            styles.childStatus,
                            isActive ? styles.childStatusActive : styles.childStatusPending,
                          ]}
                        >
                          {status}
                        </Text>
                        {child.linked_at && (
                          <Text style={styles.childLinkedDate}>
                            • Linked {new Date(child.linked_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      {locationsLoading ? (
                        <Text style={styles.childNoLocation}>Loading location...</Text>
                        ) : location && location.latitude !== null && location.latitude !== undefined && 
                            location.longitude !== null && location.longitude !== undefined &&
                            !isNaN(Number(location.latitude)) && !isNaN(Number(location.longitude)) ? (
                        <>
                          <Text style={styles.childLocation} numberOfLines={1}>
                            📍 {location.address || `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}`}
                          </Text>
                          <View style={styles.childMetaRow}>
                            <Text style={styles.childTime}>
                              {getTimeAgo(location.recorded_at || location.updated_at || location.age)}
                            </Text>
                            {location.battery_level !== null && location.battery_level !== undefined && (
                              <Text style={styles.childBattery}>
                                🔋 {location.battery_level}%
                              </Text>
                            )}
                          </View>
                        </>
                      ) : (
                        <Text style={styles.childNoLocation}>No location data available</Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Add Button */}
      {children.length > 0 && (
        <TouchableOpacity style={styles.floatingButton} onPress={handleAddChild}>
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      )}
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
    paddingTop: theme.spacing.xl,
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
  header: {
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
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
    marginBottom: theme.spacing.xl,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
  },
  addButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  childCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#cfe9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  childInitials: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  statusDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusDotActive: {
    backgroundColor: theme.colors.success,
  },
  statusDotPending: {
    backgroundColor: theme.colors.warning,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  childStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  childStatus: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    marginRight: theme.spacing.xs,
  },
  childStatusActive: {
    color: theme.colors.success,
  },
  childStatusPending: {
    color: theme.colors.warning,
  },
  childLinkedDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  childLocation: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  childMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  childTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  childBattery: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  childNoLocation: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  arrow: {
    fontSize: 24,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.bold,
  },
  floatingButton: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  floatingButtonText: {
    fontSize: 32,
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.bold,
    lineHeight: 32,
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
});

export default ChildrenListScreen;
