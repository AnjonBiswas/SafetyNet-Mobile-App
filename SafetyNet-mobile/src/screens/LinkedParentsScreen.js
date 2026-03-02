import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { parentLinkService } from '../services';
import theme from '../utils/theme';

function LinkedParentsScreen() {
  const navigation = useNavigation();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchParents = async () => {
    try {
      setLoading(true);
      const res = await parentLinkService.getLinkedParents();
      if (res.success) {
        setParents(res.data || []);
      } else {
        Alert.alert('Error', res.message || 'Failed to load parents');
      }
    } catch (error) {
      console.error('Error loading linked parents:', error);
      Alert.alert('Error', 'Failed to load linked parents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchParents();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchParents();
  };

  const handleToggleSharing = async (parentId, enabled) => {
    if (processingIds.has(parentId)) return;
    setProcessingIds((prev) => new Set([...prev, parentId]));
    try {
      const res = await parentLinkService.updateLocationSharing(parentId, !enabled);
      if (res.success) {
        setParents((prev) =>
          prev.map((p) =>
            p.parent_id === parentId
              ? { ...p, location_sharing_enabled: !enabled }
              : p
          )
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to update sharing');
      }
    } catch (error) {
      console.error('Error updating location sharing:', error);
      Alert.alert('Error', 'Failed to update location sharing');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
  };

  const handleRemoveParent = (parentId) => {
    Alert.alert(
      'Remove Parent',
      'Are you sure you want to remove this parent? They will no longer receive your location or SOS alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await parentLinkService.removeParent(parentId);
              if (res.success) {
                setParents((prev) => prev.filter((p) => p.parent_id !== parentId));
              } else {
                Alert.alert('Error', res.message || 'Failed to remove parent');
              }
            } catch (error) {
              console.error('Error removing parent:', error);
              Alert.alert('Error', 'Failed to remove parent');
            }
          },
        },
      ]
    );
  };

  const renderParent = (item) => {
    const parent = item.parent || {};
    const initials = (parent.name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    const enabled = !!item.location_sharing_enabled;
    const busy = processingIds.has(item.parent_id);

    return (
      <View key={item.parent_id} style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.name}>{parent.name || 'Unknown Parent'}</Text>
            <Text style={styles.email}>{parent.email || ''}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.sharingRow}>
            <Text style={styles.sharingLabel}>Location Sharing</Text>
            <Switch
              value={enabled}
              onValueChange={() => handleToggleSharing(item.parent_id, enabled)}
              disabled={busy}
            />
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveParent(item.parent_id)}
            disabled={busy}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧑‍💼</Text>
      <Text style={styles.emptyTitle}>No linked parents</Text>
      <Text style={styles.emptyText}>
        Ask your parent to install SafetyNet Parent and send you a link request.
        You’ll see them here once you accept.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading linked parents...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Linked Parents</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Who can see your location?</Text>
          <Text style={styles.infoText}>
            Only parents listed here can see your location and SOS alerts. You can
            turn location sharing on or off for each parent, or remove them entirely.
          </Text>
        </View>

        {parents.length === 0 ? (
          renderEmpty()
        ) : (
          parents.map(renderParent)
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  infoText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
  },
  name: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  email: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  sharingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sharingLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginRight: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.semibold,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 12,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.textMuted,
  },
});

export default LinkedParentsScreen;


