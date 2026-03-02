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
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { geofenceService, childrenService } from '../../services';
import theme from '../../utils/theme';

const GeofencesScreen = () => {
  const navigation = useNavigation();
  const [geofences, setGeofences] = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  /**
   * Fetch geofences and children
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch children
      const childrenResponse = await childrenService.getChildren();
      if (childrenResponse.success) {
        setChildren(childrenResponse.data || []);
      }

      // Fetch all geofences
      const geofencesResponse = await geofenceService.getGeofences();
      if (geofencesResponse.success) {
        setGeofences(geofencesResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching geofences:', error);
      Alert.alert('Error', 'Failed to load geofences. Please try again.');
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
    fetchData();
  }, []);

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  /**
   * Get child name by ID
   */
  const getChildName = (childId) => {
    const child = children.find((c) => c.child_id === childId);
    return child?.child?.full_name || child?.child?.name || 'Unknown Child';
  };

  /**
   * Group geofences by child
   */
  const groupGeofencesByChild = () => {
    const grouped = {};
    geofences.forEach((geofence) => {
      const childId = geofence.child_id;
      if (!grouped[childId]) {
        grouped[childId] = [];
      }
      grouped[childId].push(geofence);
    });
    return grouped;
  };

  /**
   * Handle toggle geofence active status
   */
  const handleToggle = async (geofence) => {
    if (processingIds.has(geofence.id)) return;

    try {
      setProcessingIds((prev) => new Set([...prev, geofence.id]));
      const response = await geofenceService.updateGeofence(geofence.id, {
        is_active: !geofence.is_active,
      });

      if (response.success) {
        // Update local state
        setGeofences((prev) =>
          prev.map((g) => (g.id === geofence.id ? { ...g, is_active: !g.is_active } : g))
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update geofence');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update geofence. Please try again.');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(geofence.id);
        return newSet;
      });
    }
  };

  /**
   * Handle edit geofence
   */
  const handleEdit = (geofence) => {
    navigation.navigate('CreateGeofence', { geofenceId: geofence.id });
  };

  /**
   * Handle delete geofence
   */
  const handleDelete = (geofence) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await geofenceService.deleteGeofence(geofence.id);
              if (response.success) {
                setGeofences((prev) => prev.filter((g) => g.id !== geofence.id));
                Alert.alert('Success', 'Geofence deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete geofence');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete geofence. Please try again.');
            }
          },
        },
      ]
    );
  };

  /**
   * Handle add geofence
   */
  const handleAdd = () => {
    navigation.navigate('CreateGeofence');
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
          <Text style={styles.loadingText}>Loading geofences...</Text>
        </View>
      </LinearGradient>
    );
  }

  const groupedGeofences = groupGeofencesByChild();
  const childIds = Object.keys(groupedGeofences);

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
          <Text style={styles.headerTitle}>Safe Zones (Geofences)</Text>
          <Text style={styles.headerSubtitle}>
            {geofences.length} geofence{geofences.length !== 1 ? 's' : ''} across {childIds.length} {childIds.length === 1 ? 'child' : 'children'}
          </Text>
        </View>

        {/* Geofences by Child */}
        {childIds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyText}>No geofences created yet</Text>
            <Text style={styles.emptyHint}>
              Create safe zones to get notified when your child enters or exits
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>+ Create Geofence</Text>
            </TouchableOpacity>
          </View>
        ) : (
          childIds.map((childId) => {
            const childGeofences = groupedGeofences[childId];
            const childName = getChildName(parseInt(childId));

            return (
              <View key={childId} style={styles.childSection}>
                <View style={styles.childSectionHeader}>
                  <Text style={styles.childSectionTitle}>{childName}</Text>
                  <Text style={styles.childSectionCount}>
                    {childGeofences.length} geofence{childGeofences.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {childGeofences.map((geofence) => (
                  <View key={geofence.id} style={styles.geofenceCard}>
                    <View style={styles.geofenceCardContent}>
                      <View style={styles.geofenceCardLeft}>
                        <View style={styles.geofenceIcon}>
                          <Text style={styles.geofenceIconText}>
                            {geofence.is_active ? '🔒' : '🔓'}
                          </Text>
                        </View>
                        <View style={styles.geofenceInfo}>
                          <Text style={styles.geofenceName}>{geofence.name}</Text>
                          <View style={styles.geofenceMeta}>
                            <Text style={styles.geofenceRadius}>
                              📍 {geofence.radius}m radius
                            </Text>
                            <Text style={styles.geofenceStatus}>
                              {geofence.is_active ? '● Active' : '● Inactive'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.geofenceActions}>
                        <Switch
                          value={geofence.is_active}
                          onValueChange={() => handleToggle(geofence)}
                          disabled={processingIds.has(geofence.id)}
                          trackColor={{
                            false: theme.colors.border,
                            true: theme.colors.secondary,
                          }}
                          thumbColor={geofence.is_active ? theme.colors.textWhite : theme.colors.textMuted}
                        />
                      </View>
                    </View>
                    <View style={styles.geofenceCardActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(geofence)}
                      >
                        <Text style={styles.actionButtonText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDelete(geofence)}
                      >
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                          🗑️ Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={handleAdd}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
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
  childSection: {
    marginBottom: theme.spacing.xl,
  },
  childSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  childSectionTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  childSectionCount: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  geofenceCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  geofenceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  geofenceCardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  geofenceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  geofenceIconText: {
    fontSize: 24,
  },
  geofenceInfo: {
    flex: 1,
  },
  geofenceName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  geofenceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  geofenceRadius: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  geofenceStatus: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  geofenceActions: {
    marginLeft: theme.spacing.md,
  },
  geofenceCardActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  deleteButton: {
    backgroundColor: '#fee',
  },
  deleteButtonText: {
    color: theme.colors.error,
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

export default GeofencesScreen;
