import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import linkRequestService from '../../services/linkRequestService';
import theme from '../../utils/theme';

// My Children Tab Component
function MyChildrenTab({ navigation }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await linkRequestService.getLinkedChildren();
      if (res.success) {
        setChildren(res.data?.children || []);
      } else {
        Alert.alert('Error', res.message || 'Failed to load children');
      }
    } catch (error) {
      console.error('Error loading linked children:', error);
      Alert.alert('Error', 'Failed to load linked children');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChildren();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchChildren();
  };

  const handleRemove = async (childId) => {
    Alert.alert(
      'Remove Child',
      'Are you sure you want to remove this child? You will no longer be able to monitor their safety.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (processingIds.has(childId)) return;
            setProcessingIds((prev) => new Set([...prev, childId]));
            try {
              const res = await linkRequestService.removeChild(childId);
              if (res.success) {
                setChildren((prev) => prev.filter((c) => c.child?.id !== childId));
                Alert.alert('Success', 'Child removed successfully');
              } else {
                Alert.alert('Error', res.message || 'Failed to remove child');
              }
            } catch (error) {
              console.error('Error removing child:', error);
              Alert.alert('Error', 'Failed to remove child');
            } finally {
              setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(childId);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderChildItem = ({ item }) => {
    const child = item.child || {};
    const childName = child.full_name || child.name || 'Unknown';
    const initials = getInitials(childName);
    const busy = processingIds.has(child.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ChildDetail', { childId: child.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
            {item.status === 'active' && (
              <View style={styles.statusDot} />
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{childName}</Text>
            <Text style={styles.email}>{child.email || ''}</Text>
            {item.linked_at && (
              <Text style={styles.linkedDate}>
                Linked {new Date(item.linked_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.removeButton, busy && styles.removeButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            handleRemove(child.id);
          }}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
              <Text style={styles.removeText}>Remove</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👶</Text>
      <Text style={styles.emptyTitle}>No linked children</Text>
      <Text style={styles.emptyText}>
        You haven't linked with any children yet. Tap the + button to send a link request.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      <FlatList
        data={children}
        keyExtractor={(item) => item.child?.id?.toString() || Math.random().toString()}
        renderItem={renderChildItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
}

// Requests Tab Component
function RequestsTab({ navigation, pendingCount }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await linkRequestService.getReceivedRequests();
      if (res.success) {
        setRequests(res.data?.requests || []);
      } else {
        Alert.alert('Error', res.message || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleAccept = async (id) => {
    if (processingIds.has(id)) return;
    setProcessingIds((prev) => new Set([...prev, id]));
    try {
      const res = await linkRequestService.acceptRequest(id);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        Alert.alert('Success', 'Child linked successfully!');
        // Refresh children list
        navigation.navigate('ChildrenList');
      } else {
        Alert.alert('Error', res.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async (id) => {
    if (processingIds.has(id)) return;
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingIds((prev) => new Set([...prev, id]));
            try {
              const res = await linkRequestService.rejectRequest(id);
              if (res.success) {
                setRequests((prev) => prev.filter((r) => r.id !== id));
              } else {
                Alert.alert('Error', res.message || 'Failed to reject request');
              }
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject request');
            } finally {
              setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderRequestItem = ({ item }) => {
    const child = item.child || {};
    const childName = child.full_name || child.name || child.email || 'Unknown Child';
    const initials = getInitials(childName);
    const busy = processingIds.has(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{childName}</Text>
            <Text style={styles.email}>{child.email || ''}</Text>
            {item.message && <Text style={styles.message}>{item.message}</Text>}
            {item.requested_at && (
              <Text style={styles.requestDate}>
                {new Date(item.requested_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.acceptText}>Accept</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Text style={styles.rejectText}>Reject</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📬</Text>
      <Text style={styles.emptyTitle}>No pending requests</Text>
      <Text style={styles.emptyText}>
        When a child wants to link with you, their request will appear here.
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRequestItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
}

// Main Children Screen with Tabs
function ChildrenScreen({ navigation, route }) {
  const initialTab = route?.params?.initialTab || 'children';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = async () => {
    try {
      const res = await linkRequestService.getPendingCount();
      if (res.success) {
        setPendingCount(res.data?.count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [])
  );

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Children</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate('SentRequests')}
          >
            <Ionicons name="send-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddChild')}
          >
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Custom Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'children' && styles.tabActive]}
          onPress={() => setActiveTab('children')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'children' && styles.tabTextActive,
            ]}
          >
            My Children
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'requests' && styles.tabTextActive,
            ]}
          >
            Requests
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'children' ? (
        <MyChildrenTab navigation={navigation} />
      ) : (
        <RequestsTab navigation={navigation} pendingCount={pendingCount} />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddChild')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  headerRight: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    marginHorizontal: theme.spacing.base,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    ...theme.shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: theme.fonts.weights.bold,
  },
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#cfe9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    position: 'relative',
  },
  avatarText: {
    color: theme.colors.textDark,
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
  },
  statusDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  email: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  message: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  linkedDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  requestDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.success,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  acceptText: {
    color: '#fff',
    fontWeight: theme.fonts.weights.bold,
    fontSize: theme.fonts.sizes.base,
  },
  rejectText: {
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.bold,
    fontSize: theme.fonts.sizes.base,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: 6,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeText: {
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.medium,
    fontSize: theme.fonts.sizes.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: theme.spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.base,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  fab: {
    position: 'absolute',
    right: theme.spacing.base,
    bottom: theme.spacing.base,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
});

export default ChildrenScreen;

