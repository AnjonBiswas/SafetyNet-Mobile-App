import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import theme from '../../utils/theme';

/**
 * Geofence Map Component
 * Reusable map component for displaying and editing geofences
 */
const GeofenceMap = ({
  initialCenter = null,
  initialRadius = 100,
  childLocation = null,
  onLocationChange = null,
  onRadiusChange = null,
  editable = true,
  geofences = [], // Array of existing geofences to display
  style = {},
}) => {
  const mapRef = useRef(null);
  const [center, setCenter] = useState(
    initialCenter || { latitude: 37.78825, longitude: -122.4324 }
  );
  const [radius, setRadius] = useState(initialRadius);

  useEffect(() => {
    if (initialCenter) {
      setCenter(initialCenter);
      // Center map on initial location
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: initialCenter.latitude,
            longitude: initialCenter.longitude,
            latitudeDelta: radius / 111000 * 4, // Convert meters to degrees (roughly)
            longitudeDelta: radius / 111000 * 4,
          },
          500
        );
      }
    }
  }, [initialCenter]);

  useEffect(() => {
    if (initialRadius !== undefined) {
      setRadius(initialRadius);
    }
  }, [initialRadius]);

  /**
   * Handle map press to set center
   */
  const handleMapPress = (event) => {
    if (!editable) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newCenter = { latitude, longitude };
    setCenter(newCenter);

    if (onLocationChange) {
      onLocationChange(newCenter);
    }

    // Center map on new location
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude,
          longitude,
          latitudeDelta: radius / 111000 * 4,
          longitudeDelta: radius / 111000 * 4,
        },
        300
      );
    }
  };

  /**
   * Handle marker drag end
   */
  const handleMarkerDragEnd = (event) => {
    if (!editable) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newCenter = { latitude, longitude };
    setCenter(newCenter);

    if (onLocationChange) {
      onLocationChange(newCenter);
    }
  };

  /**
   * Center on child location
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
      500
    );
  };

  // Calculate delta for map region based on radius
  const getDeltaFromRadius = (radiusInMeters) => {
    // Rough conversion: 1 degree ≈ 111km
    return radiusInMeters / 111000 * 4;
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: getDeltaFromRadius(radius),
          longitudeDelta: getDeltaFromRadius(radius),
        }}
        onPress={handleMapPress}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Existing Geofences */}
        {geofences.map((geofence) => (
          <Circle
            key={geofence.id}
            center={{
              latitude: geofence.latitude,
              longitude: geofence.longitude,
            }}
            radius={geofence.radius}
            strokeWidth={2}
            strokeColor={geofence.is_active ? theme.colors.secondary : theme.colors.textMuted}
            fillColor={
              geofence.is_active
                ? `${theme.colors.secondary}30`
                : `${theme.colors.textMuted}20`
            }
          />
        ))}

        {/* Active Geofence Circle (being edited) */}
        {editable && (
          <Circle
            center={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            radius={radius}
            strokeWidth={3}
            strokeColor={theme.colors.primary}
            fillColor={`${theme.colors.primary}20`}
          />
        )}

        {/* Center Marker (draggable if editable) */}
        {editable ? (
          <Marker
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            draggable
            onDragEnd={handleMarkerDragEnd}
            title="Geofence Center"
            description={`Radius: ${radius}m`}
          >
            <View style={styles.centerMarker}>
              <View style={styles.centerMarkerDot} />
            </View>
          </Marker>
        ) : (
          <Marker
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            title="Geofence Center"
            description={`Radius: ${radius}m`}
          >
            <View style={styles.centerMarker}>
              <View style={styles.centerMarkerDot} />
            </View>
          </Marker>
        )}

        {/* Child Location Marker */}
        {childLocation && (
          <Marker
            coordinate={{
              latitude: childLocation.latitude,
              longitude: childLocation.longitude,
            }}
            title="Child Location"
            pinColor={theme.colors.blue}
          />
        )}
      </MapView>

      {/* Quick Actions Overlay */}
      {childLocation && editable && (
        <View style={styles.actionsOverlay}>
          <TouchableOpacity style={styles.actionButton} onPress={centerOnChild}>
            <Text style={styles.actionButtonText}>📍 Use Child Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions Overlay */}
      {editable && (
        <View style={styles.instructionsOverlay}>
          <Text style={styles.instructionsText}>
            {geofences.length > 0 ? 'Tap map or drag marker to set center' : 'Tap on map to set geofence center'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  centerMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  actionsOverlay: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 1,
  },
  actionButton: {
    backgroundColor: '#fff',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  actionButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
  },
  instructionsOverlay: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    zIndex: 1,
  },
  instructionsText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textWhite,
    textAlign: 'center',
  },
});

export default GeofenceMap;

