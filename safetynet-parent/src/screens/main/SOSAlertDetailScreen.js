import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { sosService, childrenService } from '../../services';
import useRealtime from '../../hooks/useRealtime';
import theme from '../../utils/theme';
import Button from '../../components/common/Button';

const SOSAlertDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { alertId } = route.params || {};

  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);

  /**
   * Fetch alert details
   */
  const fetchAlertDetails = async () => {
    if (!alertId) {
      Alert.alert('Error', 'Alert ID is missing');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const response = await sosService.getAlertDetail(alertId);
      if (response.success && response.data) {
        setAlert(response.data);
      } else {
        Alert.alert('Error', 'Alert not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching alert details:', error);
      Alert.alert('Error', 'Failed to load alert details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchAlertDetails();
    }, [alertId])
  );

  // Realtime location updates during active SOS
  useRealtime({
    alertId,
    onSosLocationUpdated: (data) => {
      if (data.latitude && data.longitude) {
        setLiveLocation({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    },
  });

  /**
   * Handle acknowledge alert
   */
  const handleAcknowledge = async () => {
    if (!alertId) return;

    try {
      setProcessing(true);
      const response = await sosService.acknowledgeAlert(alertId);
      if (response.success) {
        Alert.alert('Success', 'Alert acknowledged');
        fetchAlertDetails();
      } else {
        Alert.alert('Error', response.message || 'Failed to acknowledge alert');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to acknowledge alert. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle resolve alert
   */
  const handleResolve = async () => {
    Alert.alert(
      'Resolve Alert',
      'Are you sure you want to resolve this alert? This will mark it as resolved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const response = await sosService.resolveAlert(alertId);
              if (response.success) {
                Alert.alert('Success', 'Alert resolved', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert('Error', response.message || 'Failed to resolve alert');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to resolve alert. Please try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle track live
   */
  const handleTrackLive = () => {
    if (!alert?.child_id) return;
    navigation.navigate('LiveTracking', { childId: alert.child_id, alertId: alert.id });
  };

  /**
   * Handle view SOS videos for this child/alert
   * This reuses the existing SOS videos UI in ChildDetailScreen.
   */
  const handleViewVideos = () => {
    if (!alert?.child_id) return;
    navigation.navigate('ChildrenTab', {
      screen: 'ChildDetail',
      params: {
        childId: alert.child_id,
        // ChildDetailScreen can use this later to auto-switch to videos tab if desired
        fromAlertId: alert.id,
      },
    });
  };

  /**
   * Handle call child
   */
  const handleCall = async () => {
    // Fetch child data to get phone number
    try {
      const response = await childrenService.getChildren();
      if (response.success) {
        const child = response.data?.find((c) => c.child_id === alert?.child_id);
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
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get child information');
    }
  };

  /**
   * Format date time
   */
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Not available';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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
   * Get child name
   */
  const getChildName = () => {
    return alert?.child?.full_name || alert?.child?.name || 'Unknown Child';
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
          <Text style={styles.loadingText}>Loading alert details...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!alert) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Alert not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </LinearGradient>
    );
  }

  const isActive = alert.status === 'active';

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Alert Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={isActive ? ['#ff6b97', '#f7396c', '#e91e7d'] : ['#6c757d', '#5a6268']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>🚨</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle}>SOS ALERT</Text>
                <Text style={styles.headerChildName}>{getChildName()}</Text>
                <View style={styles.headerStatusContainer}>
                  <View
                    style={[
                      styles.headerStatusBadge,
                      { backgroundColor: getStatusColor(alert.status) + '40' },
                    ]}
                  >
                    <Text style={styles.headerStatusText}>
                      {(alert.status || 'unknown').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Map Section */}
        {alert.latitude && alert.longitude && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alert Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: alert.latitude,
                  longitude: alert.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                region={{
                  latitude: alert.latitude,
                  longitude: alert.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: alert.latitude,
                    longitude: alert.longitude,
                  }}
                  title="SOS Alert Location"
                  description={alert.address || 'Alert location'}
                  pinColor={theme.colors.error}
                />
              </MapView>
            </View>
            {alert.address && (
              <Text style={styles.addressText}>📍 {alert.address}</Text>
            )}
          </View>
        )}

        {/* Timeline Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: theme.colors.error }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Triggered</Text>
                <Text style={styles.timelineValue}>{formatDateTime(alert.triggered_at)}</Text>
              </View>
            </View>

            {alert.acknowledged_at && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.colors.warning }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Acknowledged</Text>
                  <Text style={styles.timelineValue}>{formatDateTime(alert.acknowledged_at)}</Text>
                </View>
              </View>
            )}

            {alert.resolved_at && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.colors.success }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Resolved</Text>
                  <Text style={styles.timelineValue}>{formatDateTime(alert.resolved_at)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Message Section */}
        {alert.message && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{alert.message}</Text>
            </View>
          </View>
        )}

        {/* SOS Video Section (shortcut into existing videos UI) */}
        {alert.child_id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recorded SOS Video</Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                When this SOS was triggered, the child app recorded a short emergency video.{"\n"}
                You can view the saved SOS videos for this child in the videos section.
              </Text>
              <Button
                title="▶ View SOS Videos"
                onPress={handleViewVideos}
                variant="secondary"
                style={[styles.actionButton, { marginTop: theme.spacing.md }]}
              />
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {isActive && (
            <>
              {alert.status !== 'acknowledged' && (
                <Button
                  title="✓ Acknowledge Alert"
                  onPress={handleAcknowledge}
                  loading={processing}
                  disabled={processing}
                  style={styles.actionButton}
                />
              )}

              <Button
                title="📍 Track Live Location"
                onPress={handleTrackLive}
                variant="secondary"
                style={styles.actionButton}
              />
            </>
          )}

          <Button
            title="📞 Call Child"
            onPress={handleCall}
            variant="secondary"
            style={styles.actionButton}
          />

          {isActive && (
            <Button
              title="✓ Resolve Alert"
              onPress={handleResolve}
              loading={processing}
              disabled={processing}
              style={[styles.actionButton, styles.resolveButton]}
            />
          )}
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
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.lg,
  },
  headerGradient: {
    padding: theme.spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  headerIconText: {
    fontSize: 32,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    letterSpacing: 2,
    marginBottom: theme.spacing.xs,
  },
  headerChildName: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.sm,
  },
  headerStatusContainer: {
    flexDirection: 'row',
  },
  headerStatusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  headerStatusText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
    letterSpacing: 1,
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
    ...theme.shadows.sm,
  },
  map: {
    flex: 1,
  },
  addressText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    paddingHorizontal: theme.spacing.sm,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.md,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  messageText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    lineHeight: 22,
  },
  actionButton: {
    marginBottom: theme.spacing.md,
  },
  resolveButton: {
    backgroundColor: theme.colors.success,
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
});

export default SOSAlertDetailScreen;
