import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { childrenService, sosService, geofenceService } from '../../services';
import { subscribeToParentChannel, subscribeToSosChannel } from '../../services/pusherService';
import theme from '../../utils/theme';

const LiveTrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { parent } = useAuth();
  const { childId, alertId } = route.params || {};

  // State
  const [childLocation, setChildLocation] = useState(null);
  const [parentLocation, setParentLocation] = useState(null);
  const [geofences, setGeofences] = useState([]);
  const [sosAlert, setSosAlert] = useState(null);
  const [isSosMode, setIsSosMode] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [locationPath, setLocationPath] = useState([]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [childData, setChildData] = useState(null);

  // Refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const locationUpdateInterval = useRef(null);
  const parentChannelRef = useRef(null);
  const sosChannelRef = useRef(null);
  const markerAnimation = useRef(new Animated.Value(1)).current;

  /**
   * Request location permission for parent location
   */
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasLocationPermission(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  /**
   * Get parent's current location
   */
  const getParentLocation = async () => {
    if (!hasLocationPermission) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setParentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting parent location:', error);
    }
  };

  /**
   * Fetch initial data
   */
  const fetchInitialData = async () => {
    if (!childId) {
      Alert.alert('Error', 'Child ID is missing');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      // Fetch child data
      const childrenResponse = await childrenService.getChildren();
      if (childrenResponse.success) {
        const child = childrenResponse.data?.find((c) => c.child_id === childId);
        if (child) {
          setChildData(child);
        }
      }

      // Fetch child location
      const locationResponse = await childrenService.getChildLocation(childId);
      if (locationResponse.success && locationResponse.data) {
        const loc = locationResponse.data;
        setChildLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          battery_level: loc.battery_level,
          recorded_at: loc.recorded_at || loc.updated_at,
        });
        setLastUpdate(new Date());
        setLocationPath([{
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: new Date(),
        }]);
      }

      // Fetch geofences
      const geofencesResponse = await geofenceService.getGeofences(childId);
      if (geofencesResponse.success) {
        const activeGeofences = (geofencesResponse.data || []).filter((g) => g.is_active);
        setGeofences(activeGeofences);
      }

      // Check for active SOS alert
      if (alertId) {
        const sosResponse = await sosService.getAlertDetail(alertId);
        if (sosResponse.success && sosResponse.data) {
          setSosAlert(sosResponse.data);
          setIsSosMode(true);
        }
      } else {
        // Check if child has any active SOS
        const sosResponse = await sosService.getAlerts('active');
        if (sosResponse.success && sosResponse.data) {
          const childSos = sosResponse.data.find((alert) => alert.child_id === childId);
          if (childSos) {
            setSosAlert(childSos);
            setIsSosMode(true);
          }
        }
      }

      // Request parent location permission
      await requestLocationPermission();
      if (hasLocationPermission) {
        await getParentLocation();
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load tracking data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Setup real-time updates
   */
  const setupRealTimeUpdates = () => {
    if (!parent?.id || !childId) return;

    // Subscribe to parent channel for location updates
    const channel = subscribeToParentChannel(parent.id, {
      onLocationUpdate: (data) => {
        if (data.child_id === childId) {
          handleLocationUpdate(data);
        }
      },
      onSosAlert: (data) => {
        if (data.alert?.child_id === childId) {
          setSosAlert(data.alert);
          setIsSosMode(true);
        }
      },
    });
    parentChannelRef.current = channel;

    // Subscribe to SOS channel if in SOS mode
    if (isSosMode && sosAlert?.id) {
      const sosChannel = subscribeToSosChannel(sosAlert.id, (data) => {
        if (data.child_id === childId) {
          handleLocationUpdate(data);
        }
      });
      sosChannelRef.current = sosChannel;
    }
  };

  /**
   * Handle location update
   */
  const handleLocationUpdate = (data) => {
    if (!data.latitude || !data.longitude) return;

    const newLocation = {
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      battery_level: data.battery_level,
      recorded_at: data.recorded_at || data.updated_at || new Date(),
    };

    setChildLocation(newLocation);
    setLastUpdate(new Date());
    setIsUpdating(true);

    // Add to path if in SOS mode
    if (isSosMode) {
      setLocationPath((prev) => [
        ...prev,
        {
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date(),
        },
      ]);
    }

    // Animate marker
    Animated.sequence([
      Animated.timing(markerAnimation, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(markerAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Center map on new location (optional, can be toggled)
    if (mapRef.current && newLocation.latitude && newLocation.longitude) {
      mapRef.current.animateToRegion(
        {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }

    setTimeout(() => setIsUpdating(false), 1000);
  };

  /**
   * Refresh location manually
   */
  const refreshLocation = async () => {
    if (!childId) return;

    try {
      setIsUpdating(true);
      const response = await childrenService.getChildLocation(childId);
      if (response.success && response.data) {
        handleLocationUpdate(response.data);
      }
    } catch (error) {
      console.error('Error refreshing location:', error);
      Alert.alert('Error', 'Failed to refresh location');
    } finally {
      setTimeout(() => setIsUpdating(false), 1000);
    }
  };

  /**
   * Center map on child
   */
  const centerOnChild = () => {
    if (!childLocation || !mapRef.current) return;

    mapRef.current.animateToRegion(
      {
        latitude: childLocation.latitude,
        longitude: childLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );
  };

  /**
   * Toggle map type
   */
  const toggleMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  /**
   * Zoom in
   */
  const zoomIn = () => {
    if (!mapRef.current || !childLocation) return;
    mapRef.current.getCamera().then((camera) => {
      if (camera && camera.zoom !== undefined) {
        mapRef.current.setCamera({
          ...camera,
          zoom: camera.zoom + 1,
        });
      } else {
        // Fallback: animate to region with smaller delta
        mapRef.current.animateToRegion({
          latitude: childLocation.latitude,
          longitude: childLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 300);
      }
    }).catch(() => {
      // Fallback if getCamera fails
      if (childLocation) {
        mapRef.current.animateToRegion({
          latitude: childLocation.latitude,
          longitude: childLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 300);
      }
    });
  };

  /**
   * Zoom out
   */
  const zoomOut = () => {
    if (!mapRef.current || !childLocation) return;
    mapRef.current.getCamera().then((camera) => {
      if (camera && camera.zoom !== undefined) {
        mapRef.current.setCamera({
          ...camera,
          zoom: Math.max(1, camera.zoom - 1),
        });
      } else {
        // Fallback: animate to region with larger delta
        mapRef.current.animateToRegion({
          latitude: childLocation.latitude,
          longitude: childLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 300);
      }
    }).catch(() => {
      // Fallback if getCamera fails
      if (childLocation) {
        mapRef.current.animateToRegion({
          latitude: childLocation.latitude,
          longitude: childLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 300);
      }
    });
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
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  /**
   * Get child initials
   */
  const getChildInitials = () => {
    if (!childData?.child) return 'C';
    const name = childData.child.full_name || childData.child.name || '';
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Get child name
   */
  const getChildName = () => {
    return childData?.child?.full_name || childData?.child?.name || 'Child';
  };

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
      setupRealTimeUpdates();

      // Setup periodic refresh (every 30 seconds) if not in SOS mode
      if (!isSosMode) {
        locationUpdateInterval.current = setInterval(() => {
          refreshLocation();
        }, 30000);
      } else {
        // More frequent updates during SOS (every 10 seconds)
        locationUpdateInterval.current = setInterval(() => {
          refreshLocation();
        }, 10000);
      }

      return () => {
        // Cleanup
        if (locationUpdateInterval.current) {
          clearInterval(locationUpdateInterval.current);
        }
        if (parentChannelRef.current) {
          parentChannelRef.current.unbind_all();
        }
        if (sosChannelRef.current) {
          sosChannelRef.current.unbind_all();
        }
      };
    }, [childId, alertId, isSosMode])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!childLocation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No location data available</Text>
        <Text style={styles.errorHint}>
          Location will appear when the child shares their location
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={{
          latitude: childLocation.latitude,
          longitude: childLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Geofences */}
        {geofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={{
              latitude: geofence.latitude,
              longitude: geofence.longitude,
            }}
            radius={geofence.radius}
            strokeWidth={2}
            strokeColor={theme.colors.secondary}
            fillColor={`${theme.colors.secondary}30`}
          />
        ))}

        {/* Location Path (SOS mode) */}
        {isSosMode && locationPath.length > 1 && (
          <Polyline
            coordinates={locationPath.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor={theme.colors.error}
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}

        {/* Child Marker */}
        <Marker
          ref={markerRef}
          coordinate={{
            latitude: childLocation.latitude,
            longitude: childLocation.longitude,
          }}
          title="Child Location"
          description={childLocation.address || 'Current location'}
        >
          <Animated.View
            style={[
              styles.childMarker,
              {
                backgroundColor: isSosMode ? theme.colors.error : theme.colors.primary,
                transform: [{ scale: markerAnimation }],
              },
            ]}
          >
            <Text style={styles.markerText}>{getChildInitials()}</Text>
            {isSosMode && <View style={styles.sosPulse} />}
          </Animated.View>
        </Marker>

        {/* Parent Marker (if location available) */}
        {parentLocation && (
          <Marker
            coordinate={{
              latitude: parentLocation.latitude,
              longitude: parentLocation.longitude,
            }}
            title="Your Location"
            pinColor={theme.colors.blue}
          />
        )}
      </MapView>

      {/* Child Info Overlay */}
      <View style={styles.infoOverlay}>
        {isSosMode && (
          <View style={styles.sosBanner}>
            <Text style={styles.sosBannerText}>🚨 SOS ALERT ACTIVE</Text>
          </View>
        )}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>{getChildInitials()}</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.childName} numberOfLines={1}>
                {getChildName()}
              </Text>
              <Text style={styles.childAddress} numberOfLines={2}>
                {childLocation.address || `${childLocation.latitude.toFixed(4)}, ${childLocation.longitude.toFixed(4)}`}
              </Text>
            </View>
            {isUpdating && (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.updateIndicator} />
            )}
          </View>
          <View style={styles.infoFooter}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Update</Text>
              <Text style={styles.infoValue}>{getTimeAgo(childLocation.recorded_at)}</Text>
            </View>
            {childLocation.battery_level !== null && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Battery</Text>
                <View style={styles.batteryContainer}>
                  <View
                    style={[
                      styles.batteryBar,
                      {
                        width: `${childLocation.battery_level}%`,
                        backgroundColor:
                          childLocation.battery_level > 50
                            ? theme.colors.success
                            : childLocation.battery_level > 20
                              ? theme.colors.warning
                              : theme.colors.error,
                      },
                    ]}
                  />
                  <Text style={styles.batteryText}>{childLocation.battery_level}%</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tracking Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Center on Child */}
          <TouchableOpacity style={styles.controlButton} onPress={centerOnChild}>
            <Text style={styles.controlButtonIcon}>📍</Text>
            <Text style={styles.controlButtonLabel}>Center</Text>
          </TouchableOpacity>

          {/* Refresh Location */}
          <TouchableOpacity
            style={styles.controlButton}
            onPress={refreshLocation}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.controlButtonIcon}>🔄</Text>
            )}
            <Text style={styles.controlButtonLabel}>Refresh</Text>
          </TouchableOpacity>

          {/* Toggle Map Type */}
          <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
            <Text style={styles.controlButtonIcon}>{mapType === 'standard' ? '🛰️' : '🗺️'}</Text>
            <Text style={styles.controlButtonLabel}>{mapType === 'standard' ? 'Satellite' : 'Map'}</Text>
          </TouchableOpacity>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
            <Text style={styles.zoomButtonText}>+</Text>
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
            <Text style={styles.zoomButtonText}>−</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: theme.fonts.sizes.xl,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
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
  infoOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1,
  },
  sosBanner: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  sosBannerText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  childAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  childAvatarText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  infoContent: {
    flex: 1,
  },
  childName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  childAddress: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  updateIndicator: {
    marginLeft: theme.spacing.sm,
  },
  infoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  batteryBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  batteryText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    minWidth: 35,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    right: theme.spacing.md,
    zIndex: 1,
  },
  controlsRow: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    ...theme.shadows.lg,
  },
  controlButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minWidth: 70,
  },
  controlButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlButtonLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  zoomControls: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  zoomButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  zoomButtonText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  childMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.lg,
    position: 'relative',
  },
  markerText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  sosPulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.error,
    opacity: 0.3,
  },
});

export default LiveTrackingScreen;
