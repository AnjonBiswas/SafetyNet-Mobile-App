import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { geofenceService, childrenService } from '../../services';
import GeofenceMap from '../../components/maps/GeofenceMap';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import theme from '../../utils/theme';

const CreateGeofenceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { geofenceId, childId: initialChildId } = route.params || {};

  // State
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(initialChildId || null);
  const [name, setName] = useState('');
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(100);
  const [childLocation, setChildLocation] = useState(null);
  const [existingGeofences, setExistingGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  /**
   * Fetch initial data
   */
  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch children
      const childrenResponse = await childrenService.getChildren();
      if (childrenResponse.success) {
        const childrenList = childrenResponse.data || [];
        setChildren(childrenList);

        // Set default child if only one
        if (childrenList.length === 1 && !selectedChildId) {
          setSelectedChildId(childrenList[0].child_id);
        }

        // If editing, load geofence data
        if (geofenceId) {
          const geofenceResponse = await geofenceService.getGeofenceById(geofenceId);
          if (geofenceResponse.success && geofenceResponse.data) {
            const geofence = geofenceResponse.data;
            setName(geofence.name);
            setCenter({ latitude: geofence.latitude, longitude: geofence.longitude });
            setRadius(geofence.radius);
            setSelectedChildId(geofence.child_id);
          }
        }
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasLocationPermission(true);
      }

      // Load existing geofences for selected child
      if (selectedChildId) {
        await loadChildData(selectedChildId);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load child data and location
   */
  const loadChildData = async (childId) => {
    try {
      // Fetch child location
      const locationResponse = await childrenService.getChildLocation(childId);
      if (locationResponse.success && locationResponse.data) {
        const loc = locationResponse.data;
        setChildLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });

        // Set center to child location if creating new geofence
        if (!geofenceId && !center) {
          setCenter({
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
        }
      }

      // Fetch existing geofences for this child
      const geofencesResponse = await geofenceService.getGeofences(childId);
      if (geofencesResponse.success) {
        const allGeofences = geofencesResponse.data || [];
        // Filter out current geofence if editing
        const filtered = geofenceId
          ? allGeofences.filter((g) => g.id !== geofenceId)
          : allGeofences;
        setExistingGeofences(filtered);
      }
    } catch (error) {
      console.error('Error loading child data:', error);
    }
  };

  /**
   * Handle child selection change
   */
  useEffect(() => {
    if (selectedChildId) {
      loadChildData(selectedChildId);
    }
  }, [selectedChildId]);

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [geofenceId])
  );

  /**
   * Handle use current location
   */
  const handleUseCurrentLocation = async () => {
    if (!hasLocationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use your current location.');
        return;
      }
      setHasLocationPermission(true);
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCenter({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  /**
   * Handle use child location
   */
  const handleUseChildLocation = () => {
    if (childLocation) {
      setCenter(childLocation);
    } else {
      Alert.alert('No Location', 'Child location is not available. Please select a location on the map.');
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!selectedChildId) {
      Alert.alert('Error', 'Please select a child');
      return false;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a geofence name');
      return false;
    }
    if (!center || !center.latitude || !center.longitude) {
      Alert.alert('Error', 'Please select a location on the map');
      return false;
    }
    if (radius < 50 || radius > 2000) {
      Alert.alert('Error', 'Radius must be between 50m and 2000m');
      return false;
    }
    return true;
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const geofenceData = {
        name: name.trim(),
        latitude: center.latitude,
        longitude: center.longitude,
        radius: Math.round(radius),
        is_active: true,
      };

      let response;
      if (geofenceId) {
        // Update existing
        response = await geofenceService.updateGeofence(geofenceId, geofenceData);
      } else {
        // Create new
        response = await geofenceService.createGeofence(selectedChildId, geofenceData);
      }

      if (response.success) {
        Alert.alert('Success', geofenceId ? 'Geofence updated successfully' : 'Geofence created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to save geofence');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save geofence. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Get selected child name
   */
  const getSelectedChildName = () => {
    const child = children.find((c) => c.child_id === selectedChildId);
    return child?.child?.full_name || child?.child?.name || 'Select Child';
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
          <Text style={styles.loadingText}>Loading...</Text>
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {geofenceId ? 'Edit Geofence' : 'Create Safe Zone'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Set up a geofence to get notified when your child enters or exits
          </Text>
        </View>

        {/* Child Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Child</Text>
          <TouchableOpacity
            style={styles.childPicker}
            onPress={() => setShowChildPicker(true)}
            disabled={children.length === 1}
          >
            <Text style={[styles.childPickerText, !selectedChildId && styles.childPickerPlaceholder]}>
              {getSelectedChildName()}
            </Text>
            {children.length > 1 && <Text style={styles.childPickerArrow}>▼</Text>}
          </TouchableOpacity>
        </View>

        {/* Geofence Name */}
        <View style={styles.section}>
          <Input
            label="Geofence Name"
            placeholder="e.g., Home, School, Park"
            value={name}
            onChangeText={setName}
            editable={!saving}
          />
        </View>

        {/* Map Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.mapContainer}>
            <GeofenceMap
              initialCenter={center}
              initialRadius={radius}
              childLocation={childLocation}
              geofences={existingGeofences}
              onLocationChange={setCenter}
              editable={true}
              style={styles.map}
            />
          </View>

          {/* Quick Location Buttons */}
          <View style={styles.locationButtons}>
            {childLocation && (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleUseChildLocation}
              >
                <Text style={styles.locationButtonText}>📍 Use Child Location</Text>
              </TouchableOpacity>
            )}
            {hasLocationPermission && (
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleUseCurrentLocation}
              >
                <Text style={styles.locationButtonText}>📍 Use My Location</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Selected Location Info */}
          {center && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoText}>
                📍 {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        {/* Radius Slider */}
        <View style={styles.section}>
          <View style={styles.radiusHeader}>
            <Text style={styles.sectionLabel}>Radius</Text>
            <Text style={styles.radiusValue}>{Math.round(radius)}m</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>50m</Text>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={2000}
              step={5}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
              disabled={saving}
            />
            <Text style={styles.sliderLabel}>2000m</Text>
          </View>
          <Text style={styles.sliderHint}>
            Adjust the radius to define the safe zone size
          </Text>
        </View>

        {/* Save Button */}
        <Button
          title={geofenceId ? 'Update Geofence' : 'Create Geofence'}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
        />

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Child Picker Modal */}
      <Modal
        visible={showChildPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowChildPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Child</Text>
              <TouchableOpacity onPress={() => setShowChildPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.child_id}
                  style={[
                    styles.modalItem,
                    selectedChildId === child.child_id && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedChildId(child.child_id);
                    setShowChildPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {child.child?.full_name || child.child?.name || 'Unknown'}
                  </Text>
                  {selectedChildId === child.child_id && (
                    <Text style={styles.modalItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    marginBottom: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  childPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  childPickerText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    flex: 1,
  },
  childPickerPlaceholder: {
    color: theme.colors.textMuted,
  },
  childPickerArrow: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.sm,
  },
  mapContainer: {
    height: 300,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  map: {
    flex: 1,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  locationButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.primary,
  },
  locationInfo: {
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  locationInfoText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  radiusValue: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: theme.spacing.md,
  },
  sliderLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    minWidth: 40,
    textAlign: 'center',
  },
  sliderHint: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: theme.spacing.lg,
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
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
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalItemSelected: {
    backgroundColor: theme.colors.backgroundLight,
  },
  modalItemText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    flex: 1,
  },
  modalItemCheck: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.bold,
  },
});

export default CreateGeofenceScreen;
