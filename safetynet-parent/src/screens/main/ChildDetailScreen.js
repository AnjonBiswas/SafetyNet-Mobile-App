import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { childrenService, sosService } from '../../services';
import theme from '../../utils/theme';
import Button from '../../components/common/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChildDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { childId } = route.params || {};

  const [child, setChild] = useState(null);
  const [location, setLocation] = useState(null);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [sosVideos, setSosVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'overview'); // overview, incidents, videos
  const [playingVideo, setPlayingVideo] = useState(null);

  /**
   * Fetch child details, location, and SOS alerts
   */
  const fetchChildData = async () => {
    if (!childId) {
      Alert.alert('Error', 'Child ID is missing');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      // Fetch child from children list (fast - show UI immediately after this)
      const childrenResponse = await childrenService.getChildren();
      if (childrenResponse.success) {
        let childrenList = [];
        if (childrenResponse.data?.children && Array.isArray(childrenResponse.data.children)) {
          childrenList = childrenResponse.data.children;
        } else if (Array.isArray(childrenResponse.data)) {
          childrenList = childrenResponse.data;
        }

        const childData = childrenList.find((c) => {
          const id = c.child?.id || c.child_id || c.id;
          return String(id) === String(childId); // Compare as strings
        });
        if (childData) {
          setChild(childData);
          // Hide loading spinner as soon as we have child data - show UI immediately
          setLoading(false);
        } else {
          Alert.alert('Error', 'Child not found');
          navigation.goBack();
          return;
        }
      } else {
        setLoading(false);
        return;
      }

      // Fetch other data in parallel (non-blocking - UI already shown)
      Promise.all([
        childrenService.getChildLocation(childId),
        sosService.getChildAlerts(childId, 'all'),
        sosService.getChildVideos(childId).catch((e) => ({ success: false, error: e })),
      ]).then(([locationResponse, sosResponse, videosResponse]) => {
        // Location (without blocking on reverse geocoding)
        if (locationResponse?.success && locationResponse.data) {
          const loc = locationResponse.data.location;
          if (loc) {
            const latitude = typeof loc.latitude === 'string' ? parseFloat(loc.latitude) : loc.latitude;
            const longitude = typeof loc.longitude === 'string' ? parseFloat(loc.longitude) : loc.longitude;

            // Set location immediately with existing address
            setLocation({
              ...loc,
              latitude,
              longitude,
              address: loc.address || null,
            });

            // Reverse geocoding in background (non-blocking)
            if (!loc.address && latitude && longitude && !Number.isNaN(latitude) && !Number.isNaN(longitude)) {
              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
                headers: {
                  'User-Agent': 'SafetyNetParentApp/1.0 (contact: support@safetynet.app)',
                },
              })
                .then((resp) => resp.json())
                .then((geo) => {
                  if (geo && geo.display_name) {
                    setLocation((prev) => ({
                      ...prev,
                      address: geo.display_name,
                    }));
                  }
                })
                .catch((e) => {
                  // Silently ignore - we already have coordinates
                  if (__DEV__) {
                    console.log('Reverse geocoding failed (non-critical):', e.message || e);
                  }
                });
            }
          }
        }

        // SOS alerts
        if (sosResponse?.success) {
          setSosAlerts(sosResponse.data?.alerts || []);
        } else {
          setSosAlerts([]);
        }

        // SOS videos
        if (videosResponse && videosResponse.success) {
          const videos = videosResponse.data?.videos || [];
          setSosVideos(videos);
        } else {
          setSosVideos([]);
        }
      }).catch((error) => {
        console.error('Error fetching additional child data:', error);
        // Don't show error alert - UI is already shown, just log
      });

      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching child data:', error);
      Alert.alert('Error', 'Failed to load child details. Please try again.');
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load data on mount and when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchChildData();
    }, [childId])
  );

  /**
   * Handle refresh
   */
  const onRefresh = () => {
    setRefreshing(true);
    fetchChildData();
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status badge color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#FF3B30';
      case 'acknowledged':
        return '#FF9500';
      case 'resolved':
        return '#34C759';
      default:
        return theme.colors.textMuted;
    }
  };

  /**
   * Delete video from local state (parent app only, not from backend)
   */
  const handleDeleteVideo = (videoToDelete) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to remove this video from your view? This will only remove it from this app, not from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSosVideos((prevVideos) =>
              prevVideos.filter((video) =>
                video.file_name !== videoToDelete.file_name &&
                video.alert_id !== videoToDelete.alert_id
              )
            );
            // If the deleted video was playing, stop it
            if (playingVideo === (videoToDelete.file_name || videoToDelete.id)) {
              setPlayingVideo(null);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle unlink child
   */
  const handleUnlink = () => {
    Alert.alert(
      'Unlink Child',
      `Are you sure you want to unlink ${child?.child?.name || child?.child?.full_name || 'this child'}? You will no longer be able to monitor them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await childrenService.unlinkChild(childId);
              if (response.success) {
                Alert.alert('Success', 'Child unlinked successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to unlink child');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to unlink child. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle call child
   */
  const handleCall = () => {
    const phoneNumber = child?.child?.phone || child?.child?.phone_number;
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available for this child');
      return;
    }

    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device.');
        }
      })
      .catch((err) => {
        console.error('Error opening phone:', err);
        Alert.alert('Error', 'Failed to make phone call.');
      });
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
          <Text style={styles.loadingText}>Loading child details...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!child) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Child not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </LinearGradient>
    );
  }

  const childName = child.child?.name || child.child?.full_name || 'Unknown';
  const childEmail = child.child?.email || 'Not available';
  const isActive = child.child?.is_active ?? child.is_active ?? false;
  const status = isActive ? 'Active' : 'Inactive';

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Child Info Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(childName)}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                <View style={[styles.statusDot, isActive && styles.statusDotPulse]} />
                <Text style={styles.statusBadgeText}>{status}</Text>
              </View>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.childName}>{childName}</Text>
              <Text style={styles.childEmail}>{childEmail}</Text>
              {child.linked_at && (
                <Text style={styles.linkedDate}>Linked on {formatDate(child.linked_at)}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'incidents' && styles.tabActive]}
            onPress={() => setActiveTab('incidents')}
          >
            <Text style={[styles.tabText, activeTab === 'incidents' && styles.tabTextActive]}>
              Incidents ({sosAlerts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
              SOS Videos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Current Location Section (interactive map on native, static OSM map on web) */}
            {(() => {
              if (!location) return false;

              const lat = Number(location.latitude);
              const lng = Number(location.longitude);

              if (
                lat === null ||
                lat === undefined ||
                lng === null ||
                lng === undefined ||
                Number.isNaN(lat) ||
                Number.isNaN(lng)
              ) {
                return false;
              }

              // On web, react-native-maps just shows a blank placeholder.
              // Use a static OpenStreetMap image instead so you see real streets.
              if (Platform.OS === 'web') {
                const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=600x300&markers=${lat},${lng},red-pushpin`;

                return (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📍 Current Location</Text>
                    <View style={styles.mapContainer}>
                      <Image
                        source={{ uri: mapUrl }}
                        style={styles.map}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={styles.addressText}>
                      📍 {location.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                    </Text>
                    <View style={styles.locationMeta}>
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                        <Text style={styles.locationTime}>
                          Last updated: {getTimeAgo(location.recorded_at || location.updated_at)}
                        </Text>
                      </View>
                      {location.battery_level !== null && location.battery_level !== undefined && (
                        <View style={styles.batteryContainer}>
                          <Ionicons name="battery-charging-outline" size={16} color={theme.colors.textMuted} />
                          <Text style={styles.batteryLabel}>Battery:</Text>
                          <View style={styles.batteryBar}>
                            <View
                              style={[
                                styles.batteryFill,
                                {
                                  width: `${Math.min(100, Math.max(0, location.battery_level))}%`,
                                  backgroundColor:
                                    location.battery_level > 50
                                      ? theme.colors.success
                                      : location.battery_level > 20
                                        ? theme.colors.warning
                                        : theme.colors.error,
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.batteryText}>{location.battery_level}%</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              }

              // Native (Android/iOS): show Google Maps static image with streets and marker
              // This ensures the map always loads properly with streets visible
              // Using Google Maps Static API (free tier: 28,000 requests/month)
              const mapStaticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6d-s6U4qGbkjUxY`;

              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📍 Current Location</Text>
                  <TouchableOpacity
                    style={styles.mapContainer}
                    activeOpacity={0.9}
                    onPress={() => {
                      // Open in Google Maps app
                      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                      Linking.openURL(url).catch((err) => {
                        console.error('Error opening Google Maps:', err);
                        Alert.alert('Error', 'Could not open Google Maps');
                      });
                    }}
                  >
                    <Image
                      source={{ uri: mapStaticUrl }}
                      style={styles.map}
                      resizeMode="cover"
                    />
                    <View style={styles.mapOverlay}>
                      <View style={styles.mapPointerContainer}>
                        <View style={styles.mapPointerInner}>
                          <Ionicons name="location" size={28} color={theme.colors.primary} />
                        </View>
                      </View>
                      <View style={styles.mapTapHint}>
                        <Ionicons name="open-outline" size={16} color={theme.colors.textWhite} />
                        <Text style={styles.mapTapHintText}>Tap to open in Google Maps</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.addressText}>
                    📍 {location.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                  </Text>
                  <View style={styles.locationMeta}>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.locationTime}>
                        Last updated: {getTimeAgo(location.recorded_at || location.updated_at)}
                      </Text>
                    </View>
                    {location.battery_level !== null && location.battery_level !== undefined && (
                      <View style={styles.batteryContainer}>
                        <Ionicons name="battery-charging-outline" size={16} color={theme.colors.textMuted} />
                        <Text style={styles.batteryLabel}>Battery:</Text>
                        <View style={styles.batteryBar}>
                          <View
                            style={[
                              styles.batteryFill,
                              {
                                width: `${Math.min(100, Math.max(0, location.battery_level))}%`,
                                backgroundColor:
                                  location.battery_level > 50
                                    ? theme.colors.success
                                    : location.battery_level > 20
                                      ? theme.colors.warning
                                      : theme.colors.error,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.batteryText}>{location.battery_level}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })() || (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📍 Current Location</Text>
                  <View style={styles.noLocationContainer}>
                    <Ionicons name="location-outline" size={48} color={theme.colors.textMuted} />
                    <Text style={styles.noLocationText}>No location data available</Text>
                    <Text style={styles.noLocationHint}>
                      Location will appear when the child shares their location
                    </Text>
                  </View>
                </View>
              )}

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{sosAlerts.filter(a => a.status === 'active').length}</Text>
                <Text style={styles.statLabel}>Active Alerts</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{sosAlerts.length}</Text>
                <Text style={styles.statLabel}>Total Incidents</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {sosAlerts.filter(a => a.status === 'resolved').length}
                </Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <Button
                title="📍 Track Live Location"
                onPress={() => navigation.navigate('ChildrenTab', {
                  screen: 'LiveTracking',
                  params: { childId },
                })}
                style={styles.actionButton}
              />
              <Button
                title="📊 View Location History"
                onPress={() => navigation.navigate('ChildrenTab', {
                  screen: 'LocationHistory',
                  params: { childId },
                })}
                variant="secondary"
                style={styles.actionButton}
              />
              {child.child?.phone || child.child?.phone_number ? (
                <Button
                  title="📞 Call Child"
                  onPress={handleCall}
                  variant="secondary"
                  style={styles.actionButton}
                />
              ) : null}
            </View>
          </>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 Incident Reports</Text>
            {sosAlerts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No incidents reported</Text>
                <Text style={styles.emptyHint}>All clear! No SOS alerts or incidents.</Text>
              </View>
            ) : (
              sosAlerts.map((alert) => (
                <TouchableOpacity
                  key={alert.id}
                  style={styles.incidentCard}
                  onPress={() => handleSosPress(alert)}
                  activeOpacity={0.7}
                >
                  <View style={styles.incidentHeader}>
                    <View style={styles.incidentIconContainer}>
                      <Ionicons name="warning" size={24} color="#FF3B30" />
                    </View>
                    <View style={styles.incidentInfo}>
                      <Text style={styles.incidentTitle}>SOS Alert</Text>
                      <Text style={styles.incidentTime}>{getTimeAgo(alert.triggered_at)}</Text>
                    </View>
                    <View
                      style={[
                        styles.incidentStatusBadge,
                        { backgroundColor: getStatusColor(alert.status) },
                      ]}
                    >
                      <Text style={styles.incidentStatusText}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {alert.message && (
                    <Text style={styles.incidentMessage} numberOfLines={2}>
                      {alert.message}
                    </Text>
                  )}
                  {alert.location && (
                    <View style={styles.incidentLocation}>
                      <Ionicons name="location" size={14} color={theme.colors.textMuted} />
                      <Text style={styles.incidentLocationText} numberOfLines={1}>
                        {alert.location.address ||
                          `${Number(alert.location.latitude).toFixed(4)}, ${Number(alert.location.longitude).toFixed(4)}`}
                      </Text>
                    </View>
                  )}
                  <View style={styles.incidentFooter}>
                    <Text style={styles.incidentDate}>{formatDate(alert.triggered_at)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎥 SOS Videos</Text>
            {sosVideos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="videocam-off-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyText}>No SOS videos available</Text>
                <Text style={styles.emptyHint}>
                  Videos will appear here when the child records SOS videos during emergencies.
                </Text>
              </View>
            ) : (
              sosVideos.map((video, index) => (
                <View key={video.file_name || `video-${video.alert_id}-${index}`} style={styles.videoCard}>
                  <View style={styles.videoHeader}>
                    <View style={styles.videoHeaderLeft}>
                      <View style={styles.videoIconContainer}>
                        <Ionicons name="videocam" size={24} color={theme.colors.primary} />
                      </View>
                      <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle}>SOS Recording</Text>
                        <Text style={styles.videoTime}>{getTimeAgo(video.triggered_at)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteVideoButton}
                      onPress={() => handleDeleteVideo(video)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                  {playingVideo === (video.file_name || video.id) ? (
                    <VideoPlayer
                      videoUrl={video.url || (video.download_path ? `${api.defaults.baseURL.replace('/api', '')}${video.download_path}` : null)}
                      onClose={() => setPlayingVideo(null)}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.videoThumbnail}
                      onPress={() => setPlayingVideo(video.file_name || video.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.videoPlaceholder}>
                        <View style={styles.playButton}>
                          <Ionicons name="play" size={40} color="#fff" />
                        </View>
                      </View>
                      <View style={styles.videoOverlay}>
                        <Text style={styles.videoPlayText}>Tap to play</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  {video.location?.address && (
                    <View style={styles.videoLocation}>
                      <Ionicons name="location" size={14} color={theme.colors.textMuted} />
                      <Text style={styles.videoLocationText} numberOfLines={1}>
                        {video.location.address}
                      </Text>
                    </View>
                  )}
                  <View style={styles.videoFooter}>
                    <Text style={styles.videoDate}>{formatDate(video.triggered_at)}</Text>
                    <View
                      style={[
                        styles.videoStatusBadge,
                        { backgroundColor: getStatusColor(video.status) },
                      ]}
                    >
                      <Text style={styles.videoStatusText}>
                        {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Unlink Button */}
        <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
          <Ionicons name="unlink-outline" size={20} color={theme.colors.error} />
          <Text style={styles.unlinkButtonText}>Unlink Child</Text>
        </TouchableOpacity>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingTop: 0,
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
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#cfe9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: theme.colors.warning,
  },
  statusBadgeActive: {
    backgroundColor: theme.colors.success,
  },
  statusBadgeInactive: {
    backgroundColor: theme.colors.textMuted,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  statusDotPulse: {
    backgroundColor: '#fff',
  },
  statusBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  headerInfo: {
    flex: 1,
  },
  childName: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  childEmail: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  linkedDate: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: theme.fonts.weights.bold,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  mapContainer: {
    height: 250,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    backgroundColor: '#f0f0f0',
    position: 'relative',
    ...theme.shadows.sm,
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPointerContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25, // Center the pointer on the marker
  },
  mapPointerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  mapTapHint: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  mapTapHintText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.medium,
  },
  addressText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  locationMeta: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  locationTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.xs,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  batteryLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  batteryBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  batteryFill: {
    height: '100%',
    borderRadius: 4,
  },
  batteryText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
    minWidth: 40,
  },
  noLocationContainer: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  noLocationText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  noLocationHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
  incidentCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  incidentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  incidentTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  incidentStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  incidentStatusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: '#fff',
  },
  incidentMessage: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    paddingLeft: 56,
  },
  incidentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingLeft: 56,
    gap: theme.spacing.xs,
  },
  incidentLocationText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    flex: 1,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingLeft: 56,
  },
  incidentDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  videoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deleteVideoButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFF5F5',
    marginLeft: theme.spacing.md,
  },
  videoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  videoTime: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  videoPlaceholder: {
    height: 200,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoUnavailable: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  videoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  videoStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  videoStatusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: '#fff',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  emptyHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  unlinkButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.semibold,
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
  videoThumbnail: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  videoOverlay: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  videoPlayText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  videoLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  videoLocationText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    flex: 1,
  },
});

// Video Player Component
const VideoPlayer = ({ videoUrl, onClose }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await AsyncStorage.getItem('@safetynet-parent:token');
        setAuthToken(token);
      } catch (error) {
        console.error('[VideoPlayer] Error getting token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <View style={videoPlayerStyles.container}>
      <TouchableOpacity
        style={videoPlayerStyles.closeButton}
        onPress={onClose}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>
      {isLoading && (
        <View style={videoPlayerStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={videoPlayerStyles.loadingText}>Loading video...</Text>
        </View>
      )}
      <View style={videoPlayerStyles.videoWrapper}>
        <View style={videoPlayerStyles.videoRotatedContainer}>
          <Video
            ref={videoRef}
            style={videoPlayerStyles.video}
            source={{
              uri: videoUrl,
              headers: authToken ? {
                'Authorization': `Bearer ${authToken}`,
              } : {},
            }}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            onLoadStart={() => {
              console.log('[VideoPlayer] Loading video:', videoUrl);
              setIsLoading(true);
            }}
            onLoad={() => {
              console.log('[VideoPlayer] Video loaded successfully');
              setIsLoading(false);
            }}
            onError={(error) => {
              console.error('[VideoPlayer] Video error:', error);
              console.error('[VideoPlayer] Video URL:', videoUrl);
              setIsLoading(false);
              Alert.alert('Error', `Failed to load video: ${error.message || 'Unknown error'}. Please check the video URL and try again.`);
            }}
            onPlaybackStatusUpdate={(status) => {
              setStatus(() => status);
              setIsPlaying(status.isPlaying || false);
            }}
          />
        </View>
      </View>
      {/* Custom Controls */}
      <View style={videoPlayerStyles.controlsContainer}>
        <TouchableOpacity
          style={videoPlayerStyles.controlButton}
          onPress={async () => {
            if (isPlaying) {
              await videoRef.current?.pauseAsync();
            } else {
              await videoRef.current?.playAsync();
            }
          }}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        <Text style={videoPlayerStyles.timeText}>
          {status.positionMillis
            ? `${Math.floor(status.positionMillis / 1000 / 60)}:${String(Math.floor((status.positionMillis / 1000) % 60)).padStart(2, '0')}`
            : '0:00'
          } / {status.durationMillis
            ? `${Math.floor(status.durationMillis / 1000 / 60)}:${String(Math.floor((status.durationMillis / 1000) % 60)).padStart(2, '0')}`
            : '0:00'
          }
        </Text>
      </View>
    </View>
  );
};

const videoPlayerStyles = StyleSheet.create({
  container: {
    width: '100%',
    min: 250,
    maxHeight: 500,
    aspectRatio: 9 / 16, // Landscape container to accommodate rotated portrait video
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoRotatedContainer: {
    // Container sized to fit rotated video without stretching
    // When portrait video (9:16) is rotated 90deg, it becomes landscape (16:9)
    // So we need a landscape container
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    // Rotate only the video content, not the controls
    // Let the video maintain its original aspect ratio
    width: '100%',
    height: '100%',
    transform: [{ rotate: '90deg' }],
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
    zIndex: 10,
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: theme.spacing.sm,
    fontSize: theme.fonts.sizes.sm,
  },
});

export default ChildDetailScreen;
