import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { format, subDays, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { childrenService } from '../../services';
import theme from '../../utils/theme';

const LocationHistoryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { childId } = route.params || {};

  // State
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [viewMode, setViewMode] = useState('map'); // 'map', 'list', 'timeline'
  const [fromDate, setFromDate] = useState(startOfDay(subDays(new Date(), 7)));
  const [toDate, setToDate] = useState(endOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [currentPlaybackLocation, setCurrentPlaybackLocation] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const playbackInterval = useRef(null);
  const playbackAnimation = useRef(new Animated.Value(0)).current;

  /**
   * Fetch location history
   */
  const fetchLocationHistory = async () => {
    if (!childId) {
      Alert.alert('Error', 'Child ID is missing');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const fromDateStr = format(fromDate, 'yyyy-MM-dd');
      const toDateStr = format(toDate, 'yyyy-MM-dd');

      const response = await childrenService.getChildLocationHistory(childId, fromDateStr, toDateStr);
      if (response.success) {
        const locationList = response.data || [];
        // Sort by recorded_at descending (newest first)
        const sorted = locationList.sort((a, b) => {
          const timeA = new Date(a.recorded_at || a.created_at);
          const timeB = new Date(b.recorded_at || b.created_at);
          return timeB - timeA;
        });
        setLocations(sorted);
        setFilteredLocations(sorted);
      }
    } catch (error) {
      console.error('Error fetching location history:', error);
      Alert.alert('Error', 'Failed to load location history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data on mount and when dates change
   */
  useEffect(() => {
    fetchLocationHistory();
  }, [fromDate, toDate, childId]);

  /**
   * Reload on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      if (childId) {
        fetchLocationHistory();
      }
    }, [childId])
  );

  /**
   * Quick filter handlers
   */
  const applyQuickFilter = (days) => {
    const today = new Date();
    setToDate(endOfDay(today));
    setFromDate(startOfDay(subDays(today, days)));
  };

  /**
   * Calculate stay duration
   */
  const calculateStayDuration = (location, nextLocation) => {
    if (!nextLocation) return null;
    const time1 = new Date(location.recorded_at || location.created_at);
    const time2 = new Date(nextLocation.recorded_at || nextLocation.created_at);
    const diffMs = Math.abs(time2 - time1);
    const diffMins = Math.floor(diffMs / 60000);
    
    // Consider stationary if within 50m and more than 5 minutes
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      nextLocation.latitude,
      nextLocation.longitude
    );
    
    if (distance < 50 && diffMins >= 5) {
      return diffMins;
    }
    return null;
  };

  /**
   * Calculate distance between two points (Haversine formula)
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Get color for location based on time (newer = brighter)
   */
  const getLocationColor = (location, index) => {
    const total = filteredLocations.length;
    const ratio = index / total;
    // Gradient from red (oldest) to green (newest)
    if (ratio < 0.33) return theme.colors.error; // Old
    if (ratio < 0.66) return theme.colors.warning; // Medium
    return theme.colors.success; // New
  };

  /**
   * Group locations by day for timeline
   */
  const groupLocationsByDay = () => {
    const grouped = {};
    filteredLocations.forEach((location) => {
      const date = new Date(location.recorded_at || location.created_at);
      const dayKey = format(date, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(location);
    });
    return grouped;
  };

  /**
   * Handle playback
   */
  const startPlayback = () => {
    if (filteredLocations.length === 0) return;

    setPlaybackActive(true);
    setPlaybackIndex(0);
    setCurrentPlaybackLocation(filteredLocations[filteredLocations.length - 1]); // Start from oldest

    const speedMultiplier = playbackSpeed;
    const baseDelay = 1000; // 1 second per location at 1x speed
    const delay = baseDelay / speedMultiplier;

    let currentIndex = filteredLocations.length - 1;

    playbackInterval.current = setInterval(() => {
      if (currentIndex >= filteredLocations.length - 1) {
        // Reached the end, restart or stop
        stopPlayback();
        return;
      }

      currentIndex++;
      const location = filteredLocations[currentIndex];
      setCurrentPlaybackLocation(location);
      setPlaybackIndex(currentIndex);

      // Animate map to location
      if (mapRef.current && location.latitude && location.longitude) {
        mapRef.current.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }
    }, delay);
  };

  /**
   * Stop playback
   */
  const stopPlayback = () => {
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
    setPlaybackActive(false);
    setCurrentPlaybackLocation(null);
  };

  /**
   * Toggle playback
   */
  const togglePlayback = () => {
    if (playbackActive) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  /**
   * Format time
   */
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return format(new Date(timestamp), 'HH:mm:ss');
  };

  /**
   * Format date time
   */
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  /**
   * Format duration
   */
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  /**
   * Handle location select
   */
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    if (mapRef.current && location.latitude && location.longitude) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

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
          <Text style={styles.loadingText}>Loading location history...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!childId) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Child ID is missing</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Prepare path coordinates for map
  const pathCoordinates = filteredLocations
    .filter((loc) => loc.latitude && loc.longitude)
    .map((loc) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));

  // Get map region bounds
  const getMapRegion = () => {
    if (pathCoordinates.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const lats = pathCoordinates.map((c) => c.latitude);
    const lons = pathCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);

    const latDelta = (maxLat - minLat) * 1.2 || 0.01;
    const lonDelta = (maxLon - minLon) * 1.2 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lonDelta, 0.01),
    };
  };

  const groupedByDay = groupLocationsByDay();

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Header with Filters */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Location History</Text>
          <Text style={styles.headerSubtitle}>
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Quick Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickFilters}
          contentContainerStyle={styles.quickFiltersContent}
        >
          <TouchableOpacity
            style={[styles.quickFilterButton, isSameDay(fromDate, startOfDay(new Date())) && styles.quickFilterActive]}
            onPress={() => applyQuickFilter(0)}
          >
            <Text style={[styles.quickFilterText, isSameDay(fromDate, startOfDay(new Date())) && styles.quickFilterTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickFilterButton, isSameDay(fromDate, startOfDay(subDays(new Date(), 1))) && styles.quickFilterActive]}
            onPress={() => applyQuickFilter(1)}
          >
            <Text style={[styles.quickFilterText, isSameDay(fromDate, startOfDay(subDays(new Date(), 1))) && styles.quickFilterTextActive]}>
              Yesterday
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickFilterButton, isSameDay(fromDate, startOfDay(subDays(new Date(), 7))) && styles.quickFilterActive]}
            onPress={() => applyQuickFilter(7)}
          >
            <Text style={[styles.quickFilterText, isSameDay(fromDate, startOfDay(subDays(new Date(), 7))) && styles.quickFilterTextActive]}>
              Last 7 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickFilterButton, isSameDay(fromDate, startOfDay(subDays(new Date(), 30))) && styles.quickFilterActive]}
            onPress={() => applyQuickFilter(30)}
          >
            <Text style={[styles.quickFilterText, isSameDay(fromDate, startOfDay(subDays(new Date(), 30))) && styles.quickFilterTextActive]}>
              Last 30 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickFilterButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.quickFilterText}>📅 Custom</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* View Mode Toggle */}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'map' && styles.viewModeActive]}
            onPress={() => setViewMode('map')}
          >
            <Text style={[styles.viewModeText, viewMode === 'map' && styles.viewModeTextActive]}>🗺️ Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>📋 List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'timeline' && styles.viewModeActive]}
            onPress={() => setViewMode('timeline')}
          >
            <Text style={[styles.viewModeText, viewMode === 'timeline' && styles.viewModeTextActive]}>⏰ Timeline</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={getMapRegion()}
            region={getMapRegion()}
          >
            {/* Path Polyline */}
            {pathCoordinates.length > 1 && (
              <Polyline
                coordinates={pathCoordinates}
                strokeColor={theme.colors.primary}
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}

            {/* Location Markers */}
            {filteredLocations.map((location, index) => {
              if (!location.latitude || !location.longitude) return null;
              const isSelected = selectedLocation?.id === location.id;
              const isPlayback = playbackActive && currentPlaybackLocation?.id === location.id;
              const color = isPlayback
                ? theme.colors.error
                : isSelected
                ? theme.colors.primary
                : getLocationColor(location, index);

              return (
                <Marker
                  key={location.id || index}
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  onPress={() => handleLocationSelect(location)}
                >
                  <View
                    style={[
                      styles.marker,
                      {
                        backgroundColor: color,
                        borderColor: isSelected || isPlayback ? '#fff' : color,
                        transform: [{ scale: isSelected || isPlayback ? 1.3 : 1 }],
                      },
                    ]}
                  >
                    <Text style={styles.markerText}>{index + 1}</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Playback Controls */}
          {filteredLocations.length > 0 && (
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.playbackButton}
                onPress={togglePlayback}
              >
                <Text style={styles.playbackButtonText}>
                  {playbackActive ? '⏸️' : '▶️'}
                </Text>
              </TouchableOpacity>
              {playbackActive && (
                <View style={styles.speedControls}>
                  <TouchableOpacity
                    style={[styles.speedButton, playbackSpeed === 1 && styles.speedButtonActive]}
                    onPress={() => setPlaybackSpeed(1)}
                  >
                    <Text style={styles.speedButtonText}>1x</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.speedButton, playbackSpeed === 2 && styles.speedButtonActive]}
                    onPress={() => setPlaybackSpeed(2)}
                  >
                    <Text style={styles.speedButtonText}>2x</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.speedButton, playbackSpeed === 4 && styles.speedButtonActive]}
                    onPress={() => setPlaybackSpeed(4)}
                  >
                    <Text style={styles.speedButtonText}>4x</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Selected Location Info */}
          {selectedLocation && (
            <View style={styles.selectedLocationCard}>
              <Text style={styles.selectedLocationTime}>
                {formatDateTime(selectedLocation.recorded_at || selectedLocation.created_at)}
              </Text>
              <Text style={styles.selectedLocationAddress} numberOfLines={2}>
                {selectedLocation.address || `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
              </Text>
              {selectedLocation.battery_level !== null && (
                <Text style={styles.selectedLocationBattery}>
                  🔋 Battery: {selectedLocation.battery_level}%
                </Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedLocation(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {filteredLocations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>No location history</Text>
              <Text style={styles.emptyHint}>
                Location history will appear here when available
              </Text>
            </View>
          ) : (
            filteredLocations.map((location, index) => {
              const nextLocation = filteredLocations[index + 1];
              const stayDuration = calculateStayDuration(location, nextLocation);

              return (
                <TouchableOpacity
                  key={location.id || index}
                  style={styles.locationCard}
                  onPress={() => handleLocationSelect(location)}
                  activeOpacity={0.7}
                >
                  <View style={styles.locationCardLeft}>
                    <View style={[styles.locationDot, { backgroundColor: getLocationColor(location, index) }]} />
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationTime}>
                        {formatTime(location.recorded_at || location.created_at)}
                      </Text>
                      <Text style={styles.locationDate}>
                        {format(new Date(location.recorded_at || location.created_at), 'MMM dd, yyyy')}
                      </Text>
                      <Text style={styles.locationAddress} numberOfLines={2}>
                        {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                      </Text>
                      {stayDuration && (
                        <Text style={styles.locationDuration}>
                          ⏱️ Stayed for {formatDuration(stayDuration)}
                        </Text>
                      )}
                    </View>
                  </View>
                  {location.battery_level !== null && (
                    <View style={styles.batteryBadge}>
                      <Text style={styles.batteryBadgeText}>{location.battery_level}%</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <ScrollView style={styles.timelineContainer} contentContainerStyle={styles.timelineContent}>
          {Object.keys(groupedByDay).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⏰</Text>
              <Text style={styles.emptyText}>No location history</Text>
              <Text style={styles.emptyHint}>
                Location history will appear here when available
              </Text>
            </View>
          ) : (
            Object.keys(groupedByDay)
              .sort()
              .reverse()
              .map((dayKey) => {
                const dayLocations = groupedByDay[dayKey];
                const dayDate = parseISO(dayKey);

                return (
                  <View key={dayKey} style={styles.timelineDay}>
                    <View style={styles.timelineDayHeader}>
                      <Text style={styles.timelineDayTitle}>
                        {format(dayDate, 'EEEE, MMMM dd')}
                      </Text>
                      <Text style={styles.timelineDayCount}>
                        {dayLocations.length} location{dayLocations.length !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    <View style={styles.timelineItems}>
                      {dayLocations.map((location, index) => {
                        const isSelected = selectedLocation?.id === location.id;
                        return (
                          <TouchableOpacity
                            key={location.id || index}
                            style={[styles.timelineItem, isSelected && styles.timelineItemSelected]}
                            onPress={() => handleLocationSelect(location)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.timelineItemLeft}>
                              <View
                                style={[
                                  styles.timelineDot,
                                  { backgroundColor: getLocationColor(location, index) },
                                ]}
                              />
                              <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.timelineItemContent}>
                              <Text style={styles.timelineItemTime}>
                                {formatTime(location.recorded_at || location.created_at)}
                              </Text>
                              <Text style={styles.timelineItemAddress} numberOfLines={1}>
                                {location.address || 'Location coordinates'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
          )}
        </ScrollView>
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContent}>
              <Text style={styles.datePickerLabel}>From Date</Text>
              <Text style={styles.datePickerValue}>
                {format(fromDate, 'MMM dd, yyyy')}
              </Text>
              <Text style={styles.datePickerLabel}>To Date</Text>
              <Text style={styles.datePickerValue}>
                {format(toDate, 'MMM dd, yyyy')}
              </Text>
              <Text style={styles.datePickerHint}>
                Date picker implementation depends on your date picker library.
                For now, use quick filters or implement a date picker component.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fonts.sizes.xl,
    color: theme.colors.error,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
  },
  backButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerTop: {
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  quickFilters: {
    marginBottom: theme.spacing.md,
  },
  quickFiltersContent: {
    gap: theme.spacing.sm,
  },
  quickFilterButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: '#fff',
    marginRight: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  quickFilterActive: {
    backgroundColor: theme.colors.primary,
  },
  quickFilterText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  quickFilterTextActive: {
    color: theme.colors.textWhite,
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#fff',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  viewModeActive: {
    backgroundColor: theme.colors.primary,
  },
  viewModeText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  viewModeTextActive: {
    color: theme.colors.textWhite,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  markerText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  playbackControls: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.lg,
  },
  playbackButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  playbackButtonText: {
    fontSize: 20,
  },
  speedControls: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  speedButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
  },
  speedButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  speedButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  selectedLocationCard: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.lg,
  },
  selectedLocationTime: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  selectedLocationAddress: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  selectedLocationBattery: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.bold,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['5xl'],
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  locationCardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationTime: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  locationDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  locationAddress: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  locationDuration: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.secondary,
    fontWeight: theme.fonts.weights.medium,
  },
  batteryBadge: {
    backgroundColor: theme.colors.backgroundLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  batteryBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  timelineContainer: {
    flex: 1,
  },
  timelineContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['5xl'],
  },
  timelineDay: {
    marginBottom: theme.spacing.xl,
  },
  timelineDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  timelineDayTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  timelineDayCount: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  timelineItems: {
    marginLeft: theme.spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    paddingLeft: theme.spacing.md,
  },
  timelineItemSelected: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  timelineItemLeft: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.sm,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.borderLight,
    marginTop: 4,
    minHeight: 40,
  },
  timelineItemContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineItemTime: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  timelineItemAddress: {
    fontSize: theme.fonts.sizes.sm,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  modalClose: {
    fontSize: theme.fonts.sizes['2xl'],
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.bold,
  },
  datePickerContent: {
    padding: theme.spacing.lg,
  },
  datePickerLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  datePickerValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.md,
  },
  datePickerHint: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  modalButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default LocationHistoryScreen;
