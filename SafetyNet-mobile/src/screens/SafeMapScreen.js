import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Dimensions,
  Image,
  Animated,
  TextInput,
  PanResponder,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, PROVIDER_DEFAULT, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeZoneCircle from '../components/SafeZoneCircle';
import { safeZonesAPI, publicReportsAPI } from '../services/api';
import theme from '../utils/theme';
import BottomNav from '../components/BottomNav';

// Get screen dimensions at module level
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SafeMapScreen Component
 * 
 * Displays a map of Dhaka with safe zones represented as blinking circles.
 * Each zone shows risk level (green/orange/red) and can be tapped to view details.
 */
const SafeMapScreen = ({ navigation }) => {
  const [safeZones, setSafeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ top: 0, left: 0 });
  const [userLocation, setUserLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiError, setApiError] = useState(null);
  // Use WebView map by default for Expo Go compatibility
  const [useWebViewMap, setUseWebViewMap] = useState(true);
  // Incident Report Modal State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const reportModalAnimation = useRef(new Animated.Value(0)).current;
  const [reportFormData, setReportFormData] = useState({
    reporter_name: '',
    contact_info: '',
    area_name: '',
    latitude: null,
    longitude: null,
    incident_type: 'harassment',
    incident_description: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    risk_level: 'medium',
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  // Zoom and Pan State
  const [mapScale, setMapScale] = useState(1);
  const [mapTranslateX, setMapTranslateX] = useState(0);
  const [mapTranslateY, setMapTranslateY] = useState(0);
  const mapScaleAnimation = useRef(new Animated.Value(1)).current;
  const mapTranslateXAnimation = useRef(new Animated.Value(0)).current;
  const mapTranslateYAnimation = useRef(new Animated.Value(0)).current;
  const lastPanX = useRef(0);
  const lastPanY = useRef(0);
  const lastScale = useRef(1);
  const lastDistance = useRef(0);
  const mapScaleRef = useRef(1); // Ref to track current scale for pan responder
  const mapTranslateXRef = useRef(0);
  const mapTranslateYRef = useRef(0);
  
  // Calculate zone positions for custom map view
  const getZonePosition = (zone) => {
    const DHAKA_LAT = 23.8103;
    const DHAKA_LNG = 90.4125;
    const LAT_DELTA = .15; // ~25km radius
    const LNG_DELTA = .15;
    
    const lat = parseFloat(zone.latitude);
    const lng = parseFloat(zone.longitude);
    
    // Normalize to 0-100% based on visible area
    const latPercent = ((lat - (DHAKA_LAT - LAT_DELTA)) / (LAT_DELTA * 2)) * 100;
    const lngPercent = ((lng - (DHAKA_LNG - LNG_DELTA)) / (LNG_DELTA * 2)) * 100;
    
    return {
      top: Math.max(0, Math.min(100, latPercent)) + '%',
      left: Math.max(0, Math.min(100, lngPercent)) + '%',
    };
  };
  
  // Try MapView - if it initializes successfully, switch to it
  useEffect(() => {
    if (mapReady) {
      console.log('[SafeMapScreen] ✅ MapView initialized - switching to native map');
      setUseWebViewMap(false);
    }
  }, [mapReady]);
  
  // Debug: Log current view mode
  useEffect(() => {
    console.log('[SafeMapScreen] View mode:', useWebViewMap ? 'Custom Map View' : 'Native MapView');
    console.log('[SafeMapScreen] Zones loaded:', safeZones.length);
  }, [useWebViewMap, safeZones.length]);
  
  // Debug: Log overlay state changes
  useEffect(() => {
    console.log('[SafeMapScreen] ========== Overlay State Change ==========');
    console.log('[SafeMapScreen] Overlay visible:', overlayVisible);
    console.log('[SafeMapScreen] Selected zone:', selectedZone ? selectedZone.area_name : 'null');
    console.log('[SafeMapScreen] Overlay position:', overlayPosition);
    if (overlayVisible && selectedZone) {
      console.log('[SafeMapScreen] ✅ Overlay should be rendering now');
      console.log('[SafeMapScreen] Overlay will render at:', overlayPosition);
    }
  }, [overlayVisible, selectedZone, overlayPosition]);

  // Debug: Log report modal state changes
  useEffect(() => {
    console.log('[SafeMapScreen] ========== Report Modal State Change ==========');
    console.log('[SafeMapScreen] Report modal visible:', reportModalVisible);
    console.log('[SafeMapScreen] Report form data:', {
      hasLocation: !!(reportFormData.latitude && reportFormData.longitude),
      areaName: reportFormData.area_name,
    });
  }, [reportModalVisible, reportFormData.latitude, reportFormData.longitude, reportFormData.area_name]);

  // Zoom Functions
  const zoomIn = () => {
    const currentScale = mapScaleRef.current;
    const newScale = Math.min(currentScale * 1.3, 3); // Max zoom 3x
    console.log('[SafeMapScreen] 🔍 Zoom In:', { from: currentScale, to: newScale });
    
    setMapScale(newScale);
    mapScaleRef.current = newScale;
    lastScale.current = newScale;
    
    Animated.timing(mapScaleAnimation, {
      toValue: newScale,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log('[SafeMapScreen] ✅ Zoom In animation completed');
    });
  };

  const zoomOut = () => {
    const currentScale = mapScaleRef.current;
    const newScale = Math.max(currentScale / 1.3, 0.5); // Min zoom 0.5x
    console.log('[SafeMapScreen] 🔍 Zoom Out:', { from: currentScale, to: newScale });
    
    setMapScale(newScale);
    mapScaleRef.current = newScale;
    lastScale.current = newScale;
    
    Animated.timing(mapScaleAnimation, {
      toValue: newScale,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      console.log('[SafeMapScreen] ✅ Zoom Out animation completed');
      // Reset pan if zoomed out to minimum
      if (newScale <= 0.5) {
        resetMapPosition();
      }
    });
  };

  const resetMapPosition = () => {
    console.log('[SafeMapScreen] 🏠 Resetting map position');
    setMapTranslateX(0);
    setMapTranslateY(0);
    mapTranslateXRef.current = 0;
    mapTranslateYRef.current = 0;
    lastPanX.current = 0;
    lastPanY.current = 0;
    
    Animated.parallel([
      Animated.timing(mapTranslateXAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(mapTranslateYAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Pan Responder for dragging the map - recreate when scale changes
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        // Always allow pan responder to start, but only process if zoomed
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Capture if zoomed in and moving
        const currentScale = mapScaleRef.current;
        const moveDistance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
        const shouldCapture = currentScale > 1.05 && moveDistance > 5;
        if (shouldCapture) {
          console.log('[SafeMapScreen] Pan move check:', { currentScale, moveDistance, shouldCapture });
        }
        return shouldCapture;
      },
      onPanResponderTerminationRequest: () => {
        return false; // Don't allow termination
      },
      onPanResponderGrant: (evt) => {
        console.log('[SafeMapScreen] 👆 Pan started');
        lastPanX.current = mapTranslateXRef.current;
        lastPanY.current = mapTranslateYRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentScale = mapScaleRef.current;
        console.log('[SafeMapScreen] Pan move:', { currentScale, dx: gestureState.dx, dy: gestureState.dy });
        
        if (currentScale > 1.05) {
          const newX = lastPanX.current + gestureState.dx;
          const newY = lastPanY.current + gestureState.dy;
          
          // Calculate map container dimensions
          const mapWidth = SCREEN_WIDTH * 0.9;
          const mapHeight = (SCREEN_HEIGHT - 200) * 0.8;
          
          // Limit panning to map bounds
          const scaledWidth = mapWidth * currentScale;
          const scaledHeight = mapHeight * currentScale;
          const maxX = (scaledWidth - mapWidth) / 2;
          const maxY = (scaledHeight - mapHeight) / 2;
          
          const clampedX = Math.max(-maxX, Math.min(maxX, newX));
          const clampedY = Math.max(-maxY, Math.min(maxY, newY));
          
          // Update refs and state immediately
          mapTranslateXRef.current = clampedX;
          mapTranslateYRef.current = clampedY;
          setMapTranslateX(clampedX);
          setMapTranslateY(clampedY);
          
          // Update animation immediately for smooth feedback
          mapTranslateXAnimation.setValue(clampedX);
          mapTranslateYAnimation.setValue(clampedY);
          
          console.log('[SafeMapScreen] Pan updated:', { clampedX, clampedY });
        } else {
          console.log('[SafeMapScreen] Pan ignored - not zoomed in enough');
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.log('[SafeMapScreen] 👆 Pan ended');
        // Finalize position - values are already set
      },
      onPanResponderTerminate: () => {
        console.log('[SafeMapScreen] Pan terminated');
      },
    })
  ).current;
  
  // Sync animation values with state and refs
  useEffect(() => {
    mapScaleRef.current = mapScale;
    mapScaleAnimation.setValue(mapScale);
    console.log('[SafeMapScreen] Scale updated:', mapScale);
  }, [mapScale]);

  useEffect(() => {
    mapTranslateXRef.current = mapTranslateX;
    mapTranslateXAnimation.setValue(mapTranslateX);
  }, [mapTranslateX]);

  useEffect(() => {
    mapTranslateYRef.current = mapTranslateY;
    mapTranslateYAnimation.setValue(mapTranslateY);
  }, [mapTranslateY]);

  // Blinking animation state for custom map markers
  const [blinkOpacity, setBlinkOpacity] = useState(1);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkOpacity(prev => prev === 1 ? 0.5 : 1);
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  
  // Generate HTML for WebView map with Leaflet.js (not used - WebView doesn't work in Expo Go)
  const generateWebViewMapHTML = () => {
    if (!safeZones || safeZones.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          <div>No zones to display</div>
        </body>
        </html>
      `;
    }

    const circles = safeZones
      .filter(zone => {
        const lat = parseFloat(zone.latitude);
        const lng = parseFloat(zone.longitude);
        return !isNaN(lat) && !isNaN(lng);
      })
      .map((zone) => {
        const lat = parseFloat(zone.latitude);
        const lng = parseFloat(zone.longitude);
        const radius = zone.radius || 400;
        
        let fillColor, strokeColor, opacity;
        if (zone.risk_level === 'red') {
          fillColor = '#FF0000';
          strokeColor = '#CC0000';
          opacity = 0.5;
        } else if (zone.risk_level === 'orange') {
          fillColor = '#FFA500';
          strokeColor = '#CC8500';
          opacity = 0.5;
        } else {
          fillColor = '#00FF00';
          strokeColor = '#00CC00';
          opacity = 0.5;
        }
        
        const incidentTypes = Array.isArray(zone.incident_details) 
          ? zone.incident_details.map(t => t.replace(/'/g, "\\'")).join(', ') 
          : 'N/A';
        
        const areaName = (zone.area_name || 'Unknown').replace(/'/g, "\\'");
        
        return `
          (function() {
            var circle${zone.id} = L.circle([${lat}, ${lng}], {
              color: '${strokeColor}',
              fillColor: '${fillColor}',
              fillOpacity: ${opacity},
              radius: ${radius},
              weight: 3
            }).addTo(map);
            
            circle${zone.id}.bindPopup(
              '<div style="font-family: Arial, sans-serif; min-width: 200px;">' +
              '<h3 style="margin: 0 0 8px 0; color: #333;">${areaName}</h3>' +
              '<p style="margin: 4px 0;"><strong>Risk Level:</strong> <span style="color: ${fillColor};">${zone.risk_level.toUpperCase()}</span></p>' +
              '<p style="margin: 4px 0;"><strong>Incidents:</strong> ${zone.incident_count}</p>' +
              '<p style="margin: 4px 0;"><strong>Types:</strong> ${incidentTypes}</p>' +
              '<p style="margin: 4px 0;"><strong>Radius:</strong> ${radius}m</p>' +
              '</div>'
            );
            
            // Blinking animation
            var animInterval${zone.id} = setInterval(function() {
              var currentOpacity = circle${zone.id}.options.fillOpacity;
              circle${zone.id}.setStyle({
                fillOpacity: currentOpacity === ${opacity} ? ${opacity * 0.6} : ${opacity}
              });
            }, 1500);
          })();
        `;
      }).join('\n');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
              integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" 
              crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
                crossorigin=""></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100vh; z-index: 1; }
          .leaflet-container { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try {
            var map = L.map('map', { 
              zoomControl: true,
              doubleClickZoom: true,
              scrollWheelZoom: true,
              dragging: true,
              touchZoom: true
            }).setView([23.8103, 90.4125], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap contributors',
              subdomains: ['a', 'b', 'c']
            }).addTo(map);
            
            // Add all circles
            ${circles}
            
            // Fit map to show all circles
            if (map.getBounds) {
              var group = new L.featureGroup(map.eachLayer(function(layer) {
                if (layer instanceof L.Circle) return layer;
              }));
              if (group.getBounds().isValid()) {
                map.fitBounds(group.getBounds().pad(0.1));
              }
            }
            
            console.log('Map initialized with ${safeZones.length} zones');
          } catch (error) {
            console.error('Map initialization error:', error);
            document.body.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading map: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  // Check if running in Expo Go (simplified check)
  useEffect(() => {
    // Try to detect Expo Go - if MapView fails to render, we'll show warning
    // For now, we'll let the map try to render and show error if it fails
    const timer = setTimeout(() => {
      if (!mapReady) {
        console.warn('[SafeMapScreen] Map not ready after 5 seconds - might be Expo Go');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [mapReady]);

  // Dhaka center coordinates - wider view to see all zones
  const DHAKA_CENTER = {
    latitude: 23.8103,
    longitude: 90.4125,
    latitudeDelta: 0.25, // Increased to show more area
    longitudeDelta: 0.25, // Increased to show more area
  };

  // Fetch safe zones from API
  useEffect(() => {
    fetchSafeZones();
    requestLocationPermission();
  }, []);

  /**
   * Request location permission and get user location
   */
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Center map on user location if available
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  /**
   * Fetch safe zones from Laravel API
   */
  const fetchSafeZones = async () => {
    try {
      setLoading(true);
      setApiError(null);
      console.log('[SafeMapScreen] Fetching safe zones from API...');
      const data = await safeZonesAPI.getAll();
      console.log('[SafeMapScreen] API Response:', data);
      console.log('[SafeMapScreen] Data type:', typeof data);
      console.log('[SafeMapScreen] Is array?', Array.isArray(data));
      
      const zones = Array.isArray(data) ? data : [];
      console.log('[SafeMapScreen] Parsed zones count:', zones.length);
      
      if (zones.length > 0) {
        console.log('[SafeMapScreen] First zone:', zones[0]);
        console.log('[SafeMapScreen] Sample zones:', zones.slice(0, 3).map(z => ({
          id: z.id,
          name: z.area_name,
          risk: z.risk_level,
          incidents: z.incident_count
        })));
      }
      
      setSafeZones(zones);
      console.log('[SafeMapScreen] ✅ Zones set in state:', zones.length);
    } catch (error) {
      console.error('[SafeMapScreen] Error fetching safe zones:', error);
      console.error('[SafeMapScreen] Error message:', error.message);
      console.error('[SafeMapScreen] Error stack:', error.stack);
      setApiError(error.message || 'Failed to load safe zones');
      setSafeZones([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle circle press - show zone details in floating overlay
   */
  const handleZonePress = (zone, markerPosition) => {
    try {
      console.log('[SafeMapScreen] ========== Opening floating overlay ==========');
      console.log('[SafeMapScreen] Zone:', zone.area_name);
      console.log('[SafeMapScreen] Marker position:', markerPosition);
      
      // Get map container dimensions
      const headerHeight = insets.top + 60;
      const bottomNavHeight = 80;
      const mapMargin = theme.spacing.md * 2;
      const mapContainerTop = headerHeight;
      const mapContainerHeight = SCREEN_HEIGHT - headerHeight - bottomNavHeight - mapMargin;
      const mapContainerLeft = theme.spacing.md;
      const mapContainerWidth = SCREEN_WIDTH - (theme.spacing.md * 2);
      
      // Parse marker position percentages
      const markerTopPercent = parseFloat(markerPosition.top.replace('%', ''));
      const markerLeftPercent = parseFloat(markerPosition.left.replace('%', ''));
      
      // Convert to pixels relative to map container
      const markerTopPx = mapContainerTop + (markerTopPercent / 100) * mapContainerHeight;
      const markerLeftPx = mapContainerLeft + (markerLeftPercent / 100) * mapContainerWidth;
      
      // Overlay dimensions
      const overlayWidth = Math.min(320, SCREEN_WIDTH - (theme.spacing.md * 2));
      const overlayHeight = 250; // Approximate height
      
      // Position overlay above marker, centered horizontally
      let overlayTop = markerTopPx - overlayHeight - 30; // 30px gap above marker
      let overlayLeft = markerLeftPx - (overlayWidth / 2);
      
      // Adjust if overlay goes off screen
      if (overlayTop < mapContainerTop + 10) {
        overlayTop = markerTopPx + 50; // Show below marker instead
      }
      if (overlayLeft < theme.spacing.md) {
        overlayLeft = theme.spacing.md;
      }
      if (overlayLeft + overlayWidth > SCREEN_WIDTH - theme.spacing.md) {
        overlayLeft = SCREEN_WIDTH - overlayWidth - theme.spacing.md;
      }
      
      console.log('[SafeMapScreen] Calculated overlay position:', { top: overlayTop, left: overlayLeft });
      console.log('[SafeMapScreen] Overlay dimensions:', { width: overlayWidth, height: overlayHeight });
      console.log('[SafeMapScreen] Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
      
      // Set visible state and data
      setOverlayVisible(true);
      setOverlayPosition({ top: overlayTop, left: overlayLeft });
      setSelectedZone(zone);
      
      // Start animation at 0.7 opacity so it's clearly visible immediately, then animate to 1
      overlayAnimation.setValue(0.7);
      
      // Animate to full opacity
      setTimeout(() => {
        Animated.spring(overlayAnimation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start((finished) => {
          console.log('[SafeMapScreen] Animation finished:', finished);
        });
      }, 100);
      
      console.log('[SafeMapScreen] ✅ Floating overlay should be visible at:', { top: overlayTop, left: overlayLeft });
    } catch (error) {
      console.error('[SafeMapScreen] Error opening overlay:', error);
      Alert.alert('Error', 'Failed to open zone details');
    }
  };
  
  /**
   * Close floating overlay
   */
  const closeOverlay = () => {
    console.log('[SafeMapScreen] Closing floating overlay');
    Animated.timing(overlayAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setOverlayVisible(false);
      setSelectedZone(null);
    });
  };

  /**
   * Format risk level for display
   */
  const formatRiskLevel = (riskLevel) => {
    switch (riskLevel) {
      case 'green':
        return 'Safe Area';
      case 'orange':
        return 'Medium Risk';
      case 'red':
        return 'High Risk';
      default:
        return 'Unknown';
    }
  };

  /**
   * Get risk level color
   */
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'green':
        return theme.colors.success;
      case 'orange':
        return theme.colors.warning;
      case 'red':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  /**
   * Open incident report modal and get current location
   */
  const openReportModal = async () => {
    try {
      console.log('[SafeMapScreen] ========== Opening report modal ==========');
      
      // Open modal first, then try to get location
      setReportModalVisible(true);
      
      // Animate modal appearance
      Animated.spring(reportModalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      
      // Try to get current location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const { latitude, longitude } = location.coords;
          
          // Get address from coordinates (reverse geocoding)
          let areaName = 'Unknown Area';
          try {
            const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geocode && geocode.length > 0) {
              const addr = geocode[0];
              areaName = addr.district || addr.subregion || addr.region || addr.name || 'Unknown Area';
            }
          } catch (error) {
            console.log('[SafeMapScreen] Geocoding failed, using coordinates');
            areaName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }

          // Update form data with location
          setReportFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            area_name: areaName,
            incident_date: new Date().toISOString().split('T')[0],
            incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          }));

          console.log('[SafeMapScreen] Location set:', { latitude, longitude, areaName });
        } else {
          console.log('[SafeMapScreen] Location permission denied, modal will open without location');
          // Set default values if location not available
          setReportFormData(prev => ({
            ...prev,
            incident_date: new Date().toISOString().split('T')[0],
            incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          }));
        }
      } catch (locationError) {
        console.error('[SafeMapScreen] Location error:', locationError);
        // Modal still opens, user can enter location manually
        setReportFormData(prev => ({
          ...prev,
          incident_date: new Date().toISOString().split('T')[0],
          incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        }));
      }
      
      console.log('[SafeMapScreen] ✅ Report modal should now be visible');
    } catch (error) {
      console.error('[SafeMapScreen] Error opening report modal:', error);
      Alert.alert('Error', 'Failed to open report form. Please try again.');
    }
  };

  /**
   * Close report modal with animation
   */
  const closeReportModal = () => {
    Animated.timing(reportModalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setReportModalVisible(false);
      // Reset animation for next open
      reportModalAnimation.setValue(0);
    });
  };

  /**
   * Submit incident report
   */
  const submitIncidentReport = async () => {
    try {
      // Validate form
      if (!reportFormData.reporter_name.trim()) {
        Alert.alert('Validation Error', 'Please enter your name');
        return;
      }
      if (!reportFormData.contact_info.trim()) {
        Alert.alert('Validation Error', 'Please enter your contact information');
        return;
      }
      if (!reportFormData.incident_description.trim()) {
        Alert.alert('Validation Error', 'Please describe the incident');
        return;
      }
      if (!reportFormData.area_name.trim()) {
        Alert.alert('Validation Error', 'Please enter the area name');
        return;
      }
      // Location is optional - use default if not provided
      const finalLatitude = reportFormData.latitude || 23.8103; // Default to Dhaka center
      const finalLongitude = reportFormData.longitude || 90.4125;

      setSubmittingReport(true);
      console.log('[SafeMapScreen] Submitting incident report...', reportFormData);

      // Format time for API (HH:mm:ss)
      const timeParts = reportFormData.incident_time.split(':');
      const formattedTime = `${timeParts[0]}:${timeParts[1]}:00`;

      const reportData = {
        ...reportFormData,
        latitude: finalLatitude,
        longitude: finalLongitude,
        incident_time: formattedTime,
      };

      const response = await publicReportsAPI.create(reportData);
      
      console.log('[SafeMapScreen] Report submitted successfully:', response);
      
      Alert.alert(
        'Report Submitted',
        'Your incident report has been submitted successfully. Thank you for helping keep our community safe!',
        [
          {
            text: 'OK',
            onPress: () => {
              setReportModalVisible(false);
              // Reset form
              setReportFormData({
                reporter_name: '',
                contact_info: '',
                area_name: '',
                latitude: null,
                longitude: null,
                incident_type: 'harassment',
                incident_description: '',
                incident_date: new Date().toISOString().split('T')[0],
                incident_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
                risk_level: 'medium',
              });
              // Refresh safe zones to show updated data
              fetchSafeZones();
            },
          },
        ]
      );
    } catch (error) {
      console.error('[SafeMapScreen] Error submitting report:', error);
      Alert.alert(
        'Submission Failed',
        error.response?.data?.message || 'Failed to submit report. Please try again.',
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safe Map Zones</Text>
        <TouchableOpacity
          style={styles.headerReportButton}
          onPress={() => {
            console.log('[SafeMapScreen] Report button tapped!');
            openReportModal();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.headerReportButtonIcon}>📝</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {useWebViewMap ? (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          ) : safeZones.length === 0 ? (
            <View style={styles.noZonesContainer}>
              <Text style={styles.noZonesText}>No safe zones found</Text>
              <Text style={styles.noZonesSubtext}>Check your API connection</Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={fetchSafeZones}
              >
                <Text style={styles.refreshButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View 
              style={styles.customMapContainer} 
              {...panResponder.panHandlers}
              collapsable={false}
            >
              {/* Enhanced Map Background with Dhaka Map Image */}
              <Animated.View
                style={[
                  styles.customMapBackground,
                  {
                    transform: [
                      { translateX: mapTranslateXAnimation },
                      { translateY: mapTranslateYAnimation },
                      { scale: mapScaleAnimation },
                    ],
                  },
                ]}
              >
                {/* Real street map - 3x3 at zoom 12 (more zoomed in, more detail) */}
                <View style={styles.stylizedMapBackground}>
                  <View style={styles.mapTileFallback} />
                  {/* Row 0 */}
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3076/1768.png' }} style={[styles.mapTile3x3, { left: '0%', top: '0%' }]} resizeMode="stretch" />
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3077/1768.png' }} style={[styles.mapTile3x3, { left: '33.33%', top: '0%' }]} resizeMode="stretch" />
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3078/1768.png' }} style={[styles.mapTile3x3, { left: '66.66%', top: '0%' }]} resizeMode="stretch" />
                  {/* Row 1 */}
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3076/1769.png' }} style={[styles.mapTile3x3, { left: '0%', top: '33.33%' }]} resizeMode="stretch" />
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3077/1769.png' }} style={[styles.mapTile3x3, { left: '33.33%', top: '33.33%' }]} resizeMode="stretch" />
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3078/1769.png' }} style={[styles.mapTile3x3, { left: '66.66%', top: '33.33%' }]} resizeMode="stretch" />
                  {/* Row 2 */}
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3076/1770.png' }} style={[styles.mapTile3x3, { left: '0%', top: '66.66%' }]} resizeMode="stretch" />
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3077/1770.png' }} style={[styles.mapTile3x3, { left: '33.33%', top: '66.66%' }]} resizeMode="stretch" />
                  <Image source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3078/1770.png' }} style={[styles.mapTile3x3, { left: '66.66%', top: '66.66%' }]} resizeMode="stretch" />
                  {/* Map label */}
                  <View style={styles.mapLabelContainer}>
                    <Text style={styles.mapLabelText}>Dhaka · Streets</Text>
                    <Text style={styles.mapLabelSubtext}>23.81°N, 90.41°E · © CARTO</Text>
                  </View>
                </View>
                
                {/* Overlay gradient for better marker visibility */}
                <View style={styles.mapOverlayGradient} />
                
                {/* Optional subtle grid overlay - very low opacity so real map shows */}
                <View style={styles.mapGridContainer} pointerEvents="none">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View key={`h-${i}`} style={[styles.gridLine, styles.gridLineHorizontal, { top: `${(i + 1) * 12.5}%` }]} />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineVertical, { left: `${(i + 1) * 12.5}%` }]} />
                  ))}
                </View>
                
                
                
                {/* Render zones as positioned markers */}
                {safeZones.map((zone) => {
                  const position = getZonePosition(zone);
                  const zoneColor = 
                    zone.risk_level === 'red' ? '#FF4444' :
                    zone.risk_level === 'orange' ? '#FF8800' : '#22C55E';
                  
                  return (
                    <TouchableOpacity
                      key={`zone-${zone.id}`}
                      style={[
                        styles.customMapMarker,
                        {
                          top: position.top,
                          left: position.left,
                          zIndex: 1000, // Ensure markers are above pan responder
                        }
                      ]}
                      onPress={() => {
                        console.log('[SafeMapScreen] ✅ Marker tapped:', zone.area_name, 'ID:', zone.id);
                        console.log('[SafeMapScreen] Marker position:', position);
                        handleZonePress(zone, position);
                      }}
                      onLongPress={() => {
                        console.log('[SafeMapScreen] Marker long pressed:', zone.area_name);
                        handleZonePress(zone, position);
                      }}
                      activeOpacity={0.6}
                      hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                      delayPressIn={0}
                      onStartShouldSetResponder={() => {
                        // Only capture if not zoomed in (allow pan when zoomed)
                        return mapScaleRef.current <= 1.05;
                      }}
                      onResponderTerminationRequest={() => {
                        // Allow pan to take over when zoomed
                        return mapScaleRef.current > 1.05;
                      }}
                    >
                      <View 
                        style={[
                          styles.customMapMarkerPulse,
                          { 
                            backgroundColor: zoneColor,
                            opacity: blinkOpacity * 0.2,
                          }
                        ]} 
                      />
                      <View 
                        style={[
                          styles.customMapMarkerInner, 
                          { 
                            backgroundColor: zoneColor,
                            opacity: blinkOpacity,
                            borderColor: '#fff',
                          }
                        ]} 
                      />
                      <View style={[styles.markerShadow, { backgroundColor: zoneColor }]} />
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>
              
              {/* Zoom Controls */}
              <View style={styles.zoomControls} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    console.log('[SafeMapScreen] 🔍 Zoom In button pressed');
                    zoomIn();
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.zoomButtonText}>+</Text>
                </TouchableOpacity>
                <View style={styles.zoomDivider} />
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    console.log('[SafeMapScreen] 🔍 Zoom Out button pressed');
                    zoomOut();
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.zoomButtonText}>−</Text>
                </TouchableOpacity>
                {mapScale > 1.1 && (
                  <>
                    <View style={styles.zoomDivider} />
                    <TouchableOpacity
                      style={styles.zoomButton}
                      onPress={() => {
                        console.log('[SafeMapScreen] 🏠 Reset button pressed');
                        resetMapPosition();
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.zoomButtonText}>⌂</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              
              {/* Modern Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <View>
                   
                    
                  </View>
                  <View style={styles.infoCardBadge}>
                    <Text style={styles.infoCardBadgeText}>Live</Text>
                  </View>
                </View>
                
              </View>
              
              {/* Modern Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    const url = `https://www.openstreetmap.org/?mlat=23.8103&mlon=90.4125&zoom=12`;
                    Linking.openURL(url).catch(err => {
                      Alert.alert('Error', 'Could not open map');
                    });
                  }}
                >
                  <Text style={styles.actionButtonIcon}>🗺️</Text>
                  <Text style={styles.actionButtonText}>Open Map</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={fetchSafeZones}
                >
                  <Text style={styles.actionButtonIcon}>🔄</Text>
                  <Text style={styles.actionButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
              
              {/* Modern Legend */}
              <View style={styles.modernLegend}>
                <Text style={styles.legendTitle}>Risk Levels</Text>
                <View style={styles.legendItems}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={styles.legendText}>Safe</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF8800' }]} />
                    <Text style={styles.legendText}>Medium</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF4444' }]} />
                    <Text style={styles.legendText}>High</Text>
                  </View>
                </View>
              </View>
            </View>
          )
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={DHAKA_CENTER}
            region={DHAKA_CENTER}
            showsUserLocation={true}
            showsMyLocationButton={true}
            mapType="standard"
            loadingEnabled={true}
            loadingIndicatorColor={theme.colors.primary}
            onMapReady={() => {
              console.log('[SafeMapScreen] ✅ Map is ready!');
              console.log('[SafeMapScreen] Safe zones to render:', safeZones.length);
              if (safeZones.length > 0) {
                console.log('[SafeMapScreen] Sample zone:', {
                  id: safeZones[0].id,
                  name: safeZones[0].area_name,
                  lat: safeZones[0].latitude,
                  lng: safeZones[0].longitude,
                  radius: safeZones[0].radius,
                  risk: safeZones[0].risk_level
                });
              }
              setMapReady(true);
              // Ensure map is centered on Dhaka
              if (mapRef.current) {
                setTimeout(() => {
                  console.log('[SafeMapScreen] Animating to region:', DHAKA_CENTER);
                  mapRef.current.animateToRegion(DHAKA_CENTER, 1000);
                }, 500);
              }
            }}
            onError={(error) => {
              console.error('[SafeMapScreen] Map error:', error);
              console.error('[SafeMapScreen] Map error details:', JSON.stringify(error, null, 2));
              setApiError(`Map Error: ${error.message || 'Unknown error'}`);
            }}
            onRegionChangeComplete={(region) => {
              console.log('[SafeMapScreen] Region changed:', region);
            }}
          >
            {/* Test marker to verify map is working - Always visible */}
            <Marker
              coordinate={DHAKA_CENTER}
              title="Dhaka, Bangladesh"
              description="SafetyNet Safe Zones Center - If you see this, map is working!"
              pinColor="red"
            />
            
            {/* Additional test markers at zone locations to verify rendering */}
            {safeZones.length > 0 && safeZones.slice(0, 5).map((zone) => (
              <Marker
                key={`marker-${zone.id}`}
                coordinate={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                title={zone.area_name}
                description={`Risk: ${zone.risk_level} | Incidents: ${zone.incident_count}`}
                pinColor={
                  zone.risk_level === 'red' ? 'red' :
                  zone.risk_level === 'orange' ? 'orange' : 'green'
                }
              />
            ))}
            
            {/* Render safe zone circles */}
            {safeZones.length > 0 && safeZones.map((zone, index) => {
              // Only log first few zones to avoid spam
              if (index < 3) {
                console.log(`[SafeMapScreen] Rendering zone ${zone.id} (${index + 1}/${safeZones.length}):`, {
                  area: zone.area_name,
                  lat: zone.latitude,
                  lng: zone.longitude,
                  radius: zone.radius,
                  risk: zone.risk_level
                });
              }
              return (
                <SafeZoneCircle
                  key={zone.id}
                  zone={zone}
                  onPress={() => handleZonePress(zone)}
                />
              );
            })}
            
            {/* Log total zones rendered */}
            {safeZones.length > 0 && (
              <View style={{ position: 'absolute', opacity: 0 }}>
                {console.log(`[SafeMapScreen] Total circles rendered: ${safeZones.length}`)}
              </View>
            )}
          </MapView>
        )}
        
        
        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading safe zones...</Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(0, 255, 0, 0.6)' }]} />
          <Text style={styles.legendText}>Safe</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 165, 0, 0.6)' }]} />
          <Text style={styles.legendText}>Medium Risk</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 0, 0, 0.6)' }]} />
          <Text style={styles.legendText}>High Risk</Text>
        </View>
      </View>

      {/* Floating Overlay Backdrop */}
      {overlayVisible && (
        <TouchableOpacity
          style={styles.overlayBackdrop}
          activeOpacity={1}
          onPress={closeOverlay}
        />
      )}

      {/* Floating Zone Details Overlay */}
      {overlayVisible && selectedZone && (
        <Animated.View
          ref={overlayRef}
          style={[
            styles.floatingOverlay,
            {
              top: overlayPosition.top > 0 ? overlayPosition.top : 150,
              left: overlayPosition.left > 0 ? overlayPosition.left : 20,
              opacity: overlayAnimation.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [0.7, 0.95, 1],
              }),
              transform: [
                {
                  scale: overlayAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
                {
                  translateY: overlayAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-5, 0],
                  }),
                },
              ],
            }
          ]}
        >
          {/* Arrow pointing to marker */}
          <View style={styles.overlayArrow} />
          
          {/* Overlay Content */}
          <View style={styles.floatingOverlayContent}>
            {/* Header */}
            <View style={styles.floatingOverlayHeader}>
              <View style={styles.floatingOverlayHeaderLeft}>
                <Text style={styles.floatingOverlayTitle}>{selectedZone.area_name}</Text>
                <View
                  style={[
                    styles.floatingRiskBadge,
                    { backgroundColor: getRiskColor(selectedZone.risk_level) },
                  ]}
                >
                  <Text style={styles.floatingRiskBadgeText}>
                    {formatRiskLevel(selectedZone.risk_level)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.floatingCloseButton}
                onPress={closeOverlay}
              >
                <Text style={styles.floatingCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Details */}
            <View style={styles.floatingOverlayDetails}>
              <View style={styles.floatingDetailRow}>
                <Text style={styles.floatingDetailLabel}>📊 Incidents:</Text>
                <Text style={styles.floatingDetailValue}>{selectedZone.incident_count || 0}</Text>
              </View>
              
              <View style={styles.floatingDetailRow}>
                <Text style={styles.floatingDetailLabel}>📏 Radius:</Text>
                <Text style={styles.floatingDetailValue}>{selectedZone.radius}m</Text>
              </View>

              {selectedZone.incident_details &&
                Array.isArray(selectedZone.incident_details) &&
                selectedZone.incident_details.length > 0 && (
                  <View style={styles.floatingIncidentTypes}>
                    <Text style={styles.floatingIncidentTypesLabel}>Types:</Text>
                    <View style={styles.floatingIncidentTypesList}>
                      {selectedZone.incident_details.slice(0, 3).map((type, index) => (
                        <View key={index} style={styles.floatingIncidentTag}>
                          <Text style={styles.floatingIncidentTagText}>{type}</Text>
                        </View>
                      ))}
                      {selectedZone.incident_details.length > 3 && (
                        <Text style={styles.floatingIncidentMore}>
                          +{selectedZone.incident_details.length - 3} more
                        </Text>
                      )}
                    </View>
                  </View>
                )}

              <TouchableOpacity
                style={styles.floatingActionButton}
                onPress={() => {
                  const url = `https://www.openstreetmap.org/?mlat=${selectedZone.latitude}&mlon=${selectedZone.longitude}&zoom=15`;
                  Linking.openURL(url).catch(err => {
                    Alert.alert('Error', 'Could not open map');
                  });
                }}
              >
                <Text style={styles.floatingActionButtonText}>🗺️ View on Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}


      {/* Incident Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeReportModal}
        onShow={() => {
          console.log('[SafeMapScreen] ✅ Report modal is now visible');
        }}
      >
        <View style={styles.reportModalOverlay}>
          <TouchableOpacity
            style={styles.reportModalBackdrop}
            activeOpacity={1}
            onPress={closeReportModal}
          />
          <Animated.View
            style={[
              styles.reportModalContent,
              {
                opacity: reportModalAnimation,
                transform: [
                  {
                    scale: reportModalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                  {
                    translateY: reportModalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView
              style={styles.reportModalScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.reportModalScrollContent}
            >
              {/* Header */}
              <View style={styles.reportModalHeader}>
                <Text style={styles.reportModalTitle}>Report Incident</Text>
                <TouchableOpacity
                  style={styles.reportModalCloseButton}
                  onPress={closeReportModal}
                >
                  <Text style={styles.reportModalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Location Info */}
              {reportFormData.latitude && reportFormData.longitude ? (
                <View style={styles.reportLocationInfo}>
                  <Text style={styles.reportLocationInfoText}>
                    📍 {reportFormData.area_name}
                  </Text>
                  <Text style={styles.reportLocationInfoSubtext}>
                    {reportFormData.latitude.toFixed(6)}, {reportFormData.longitude.toFixed(6)}
                  </Text>
                </View>
              ) : (
                <View style={styles.reportLocationInfo}>
                  <Text style={styles.reportLocationInfoText}>
                    📍 Location not detected
                  </Text>
                  <Text style={styles.reportLocationInfoSubtext}>
                    Please enter area name manually below
                  </Text>
                </View>
              )}

              {/* Form Fields */}
              <View style={styles.reportForm}>
                {/* Reporter Name */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Your Name *</Text>
                  <TextInput
                    style={styles.reportFormInput}
                    placeholder="Enter your name"
                    value={reportFormData.reporter_name}
                    onChangeText={(text) => setReportFormData(prev => ({ ...prev, reporter_name: text }))}
                  />
                </View>

                {/* Contact Info */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Contact Info *</Text>
                  <TextInput
                    style={styles.reportFormInput}
                    placeholder="Phone number or email"
                    value={reportFormData.contact_info}
                    onChangeText={(text) => setReportFormData(prev => ({ ...prev, contact_info: text }))}
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Area Name */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Area Name *</Text>
                  <TextInput
                    style={styles.reportFormInput}
                    placeholder="Enter area name (e.g., Dhanmondi, Mirpur)"
                    value={reportFormData.area_name}
                    onChangeText={(text) => setReportFormData(prev => ({ ...prev, area_name: text }))}
                  />
                </View>

                {/* Manual Location Input (if GPS not available) */}
                {(!reportFormData.latitude || !reportFormData.longitude) && (
                  <View style={styles.reportFormField}>
                    <Text style={styles.reportFormLabel}>Coordinates (Optional)</Text>
                    <View style={styles.reportCoordinatesRow}>
                      <TextInput
                        style={[styles.reportFormInput, styles.reportCoordinateInput]}
                        placeholder="Latitude"
                        value={reportFormData.latitude ? reportFormData.latitude.toString() : ''}
                        onChangeText={(text) => {
                          const lat = parseFloat(text);
                          if (!isNaN(lat)) {
                            setReportFormData(prev => ({ ...prev, latitude: lat }));
                          } else if (text === '') {
                            setReportFormData(prev => ({ ...prev, latitude: null }));
                          }
                        }}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.reportFormInput, styles.reportCoordinateInput]}
                        placeholder="Longitude"
                        value={reportFormData.longitude ? reportFormData.longitude.toString() : ''}
                        onChangeText={(text) => {
                          const lng = parseFloat(text);
                          if (!isNaN(lng)) {
                            setReportFormData(prev => ({ ...prev, longitude: lng }));
                          } else if (text === '') {
                            setReportFormData(prev => ({ ...prev, longitude: null }));
                          }
                        }}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}

                {/* Incident Type */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Incident Type *</Text>
                  <View style={styles.reportTypeButtons}>
                    {['harassment', 'theft', 'assault', 'stalking', 'other'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.reportTypeButton,
                          reportFormData.incident_type === type && styles.reportTypeButtonActive,
                        ]}
                        onPress={() => setReportFormData(prev => ({ ...prev, incident_type: type }))}
                      >
                        <Text
                          style={[
                            styles.reportTypeButtonText,
                            reportFormData.incident_type === type && styles.reportTypeButtonTextActive,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Risk Level */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Risk Level</Text>
                  <View style={styles.reportRiskButtons}>
                    {[
                      { value: 'low', label: 'Low', color: '#22C55E' },
                      { value: 'medium', label: 'Medium', color: '#FF8800' },
                      { value: 'high', label: 'High', color: '#FF4444' },
                    ].map((risk) => (
                      <TouchableOpacity
                        key={risk.value}
                        style={[
                          styles.reportRiskButton,
                          reportFormData.risk_level === risk.value && {
                            backgroundColor: risk.color,
                            borderColor: risk.color,
                          },
                        ]}
                        onPress={() => setReportFormData(prev => ({ ...prev, risk_level: risk.value }))}
                      >
                        <Text
                          style={[
                            styles.reportRiskButtonText,
                            reportFormData.risk_level === risk.value && styles.reportRiskButtonTextActive,
                          ]}
                        >
                          {risk.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Incident Date */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Incident Date *</Text>
                  <TextInput
                    style={styles.reportFormInput}
                    placeholder="YYYY-MM-DD"
                    value={reportFormData.incident_date}
                    onChangeText={(text) => setReportFormData(prev => ({ ...prev, incident_date: text }))}
                  />
                </View>

                {/* Incident Time */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Incident Time</Text>
                  <TextInput
                    style={styles.reportFormInput}
                    placeholder="HH:MM (24-hour format)"
                    value={reportFormData.incident_time}
                    onChangeText={(text) => setReportFormData(prev => ({ ...prev, incident_time: text }))}
                  />
                </View>

                {/* Description */}
                <View style={styles.reportFormField}>
                  <Text style={styles.reportFormLabel}>Description *</Text>
                  <TextInput
                    style={[styles.reportFormInput, styles.reportFormTextArea]}
                    placeholder="Describe what happened..."
                    value={reportFormData.incident_description}
                    onChangeText={(text) => setReportFormData(prev => ({ ...prev, incident_description: text }))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.reportSubmitButton, submittingReport && styles.reportSubmitButtonDisabled]}
                  onPress={submitIncidentReport}
                  disabled={submittingReport}
                >
                  {submittingReport ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.reportSubmitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNav />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    flex: 1,
    textAlign: 'center',
  },
  headerReportButton: {
    padding: theme.spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  headerReportButtonIcon: {
    fontSize: theme.fonts.sizes.xl,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#e5e5e5', // Light gray background to see if map container is there
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  customMapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden', // Clip zoomed content at container level
  },
  customMapBackground: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F0F9FF',
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.md,
    overflow: 'visible', // Changed to visible to allow zoomed content
    borderWidth: 1,
    borderColor: '#E0F2FE',
    width: '100%',
    height: '100%',
  },
  stylizedMapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    overflow: 'hidden',
  },
  mapTileFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e8eef2',
    zIndex: 0,
  },
  mapTile: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    zIndex: 1,
  },
  mapTile3x3: {
    position: 'absolute',
    width: '33.33%',
    height: '33.33%',
    zIndex: 1,
  },
  mapLabelContainer: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    zIndex: 2,
    backgroundColor: 'rgba(233, 233, 233, 0.9)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  mapLabelText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  mapLabelSubtext: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  mapOverlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 0.5,
    position: 'absolute',
  },
  // Zoom Controls
  zoomControls: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing['2xl'] + 60, // Above bottom nav
    zIndex: 1000,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    elevation: 8,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  zoomButtonText: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  zoomDivider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  mapGridContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(148, 163, 184, 0.03)',
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
  },
  gridLineVertical: {
    height: '100%',
    width: 1,
  },
  mapLabels: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    zIndex: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,

  },
  mapLabelText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    
  },
  mapLabelSubtext: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  customMapMarker: {
    position: 'absolute',
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    zIndex: 100,
  },
  customMapMarkerInner: {
    width: 38,
    height: 38,
    borderRadius: 36,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 101,
  },
  customMapMarkerPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: 99,
  },
  markerShadow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    opacity: 0.1,
    zIndex: 98,
    transform: [{ translateY: 2 }],
  },
  
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 180,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    zIndex: 200,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.xs,
    ...theme.shadows.md,
    marginBottom: -37,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  actionButtonIcon: {
    fontSize: theme.fonts.sizes.lg,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  modernLegend: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    zIndex: 200,
    ...theme.shadows.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  noDataContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.base,
  },
  noDataText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    zIndex: 1001,
  },
  debugText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugError: {
    color: '#ff6b6b',
    fontSize: theme.fonts.sizes.xs,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: theme.spacing.xs,
  },
  mapNotReadyWarning: {
    position: 'absolute',
    top: '20%',
    left: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    zIndex: 1002,
  },
  warningTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  warningText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  warningCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  warningSubtext: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  mapInfoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    zIndex: 1003,
  },
  infoText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    textAlign: 'center',
  },
  infoSubtext: {
    color: '#fff',
    fontSize: theme.fonts.sizes.xs,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    opacity: 0.9,
  },
  webViewInfoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: theme.spacing.base,
    right: theme.spacing.base,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    zIndex: 1003,
  },
  webViewInfoText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    textAlign: 'center',
  },
  webViewInfoSubtext: {
    color: '#fff',
    fontSize: theme.fonts.sizes.xs,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    opacity: 0.9,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  fallbackContent: {
    padding: theme.spacing.base,
  },
  fallbackHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.base,
    paddingBottom: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  fallbackTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  fallbackSubtext: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  openMapButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.base,
  },
  openMapButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  zonesList: {
    width: '100%',
  },
  zonesListTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  zonesListSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  zoneIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.md,
  },
  zoneContent: {
    flex: 1,
  },
  zoneName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  zoneDetails: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  zoneArrow: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textMuted,
  },
  loadingZones: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingZonesText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  noZonesContainer: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  noZonesText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  noZonesSubtext: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.xs,
  },
  legendText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
    maxHeight: '80%',
    ...theme.shadows.xl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.base,
  },
  modalScrollView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  riskBadgeText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.bold,
  },
  modalDetails: {
    padding: theme.spacing.base,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  detailLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  detailValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.semibold,
  },
  incidentTypesContainer: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  incidentTypesTitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
    marginBottom: theme.spacing.sm,
  },
  incidentTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  incidentTypeTag: {
    backgroundColor: theme.colors.backgroundLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  incidentTypeText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
  },
  coordinatesContainer: {
    paddingVertical: theme.spacing.md,
  },
  coordinatesLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
    marginBottom: theme.spacing.xs,
  },
  coordinatesText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Modern Modal Styles
  modalScrollContent: {
    paddingBottom: theme.spacing['2xl'],
  },
  modernModalHeader: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modernModalHeaderContent: {
    gap: theme.spacing.sm,
  },
  modernModalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modernModalTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    flex: 1,
  },
  modernCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernCloseButtonText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.bold,
  },
  modernRiskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    
  },
  modernRiskBadgeText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    textTransform: 'uppercase',
  },
  modernDetailsContainer: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    gap: theme.spacing.md,
  },
  modernDetailCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernDetailCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    ...theme.shadows.sm,
  },
  modernDetailCardIconText: {
    fontSize: theme.fonts.sizes.xl,
  },
  modernDetailCardContent: {
    flex: 1,
  },
  modernDetailCardLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  modernDetailCardValue: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  modernIncidentTypesCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernIncidentTypesTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  modernIncidentTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  modernIncidentTypeTag: {
    backgroundColor: '#fff',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modernIncidentTypeText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  modernModalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  modernModalActionButtonIcon: {
    fontSize: theme.fonts.sizes.lg,
  },
  modernModalActionButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  modalLoading: {
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  // Floating Overlay Styles
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  floatingOverlay: {
    position: 'absolute',
    width: SCREEN_WIDTH - (theme.spacing.md * 2),
    maxWidth: 320,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    backgroundColor: 'transparent', // Ensure background is transparent for arrow visibility
  },
  overlayArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    alignSelf: 'center',
    marginBottom: -1,
    zIndex: 1001,
  },
  floatingOverlayContent: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 200,
  },
  floatingOverlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  floatingOverlayHeaderLeft: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  floatingOverlayTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  floatingRiskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  floatingRiskBadgeText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    textTransform: 'uppercase',
  },
  floatingCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCloseButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.bold,
  },
  floatingOverlayDetails: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  floatingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingDetailLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  floatingDetailValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.bold,
  },
  floatingIncidentTypes: {
    marginTop: theme.spacing.xs,
  },
  floatingIncidentTypesLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fonts.weights.medium,
  },
  floatingIncidentTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  floatingIncidentTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  floatingIncidentTagText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textDark,
  },
  floatingIncidentMore: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    alignSelf: 'center',
    paddingVertical: 4,
  },
  floatingActionButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  floatingActionButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
  },
  // Floating Action Button (FAB) Styles
  fabButton: {
    position: 'absolute',
    top: 70,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    zIndex: 1000,
    ...theme.shadows.lg,
    elevation: 8,
  },
  fabButtonIcon: {
    fontSize: theme.fonts.sizes.lg,
  },
  fabButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  // Report Modal Styles - Floating Tab (3/4 screen)
  reportModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  reportModalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius['2xl'],
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.75, // 3/4 of screen height
    maxHeight: SCREEN_HEIGHT * 0.75,
    ...theme.shadows.xl,
    elevation: 20,
    overflow: 'hidden',
  },
  reportModalScrollView: {
    flex: 1,
  },
  reportModalScrollContent: {
    paddingBottom: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.base,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  reportModalTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  reportModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModalCloseButtonText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.bold,
  },
  reportLocationInfo: {
    backgroundColor: '#E0F2FE',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  reportLocationInfoText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  reportLocationInfoSubtext: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  reportForm: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  reportFormField: {
    marginBottom: theme.spacing.md,
  },
  reportFormLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  reportFormInput: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
  },
  reportFormTextArea: {
    minHeight: 100,
    paddingTop: theme.spacing.md,
  },
  reportTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  reportTypeButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
  },
  reportTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reportTypeButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  reportTypeButtonTextActive: {
    color: '#fff',
    fontWeight: theme.fonts.weights.bold,
  },
  reportRiskButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  reportRiskButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
  },
  reportRiskButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  reportRiskButtonTextActive: {
    color: '#fff',
    fontWeight: theme.fonts.weights.bold,
  },
  reportSubmitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  reportSubmitButtonDisabled: {
    opacity: 0.6,
  },
  reportSubmitButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  reportCoordinatesRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  reportCoordinateInput: {
    flex: 1,
  },
});

export default SafeMapScreen;
