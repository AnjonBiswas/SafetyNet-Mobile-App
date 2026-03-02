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
import Ionicons from 'react-native-vector-icons/Ionicons';
import linkRequestService from '../services/linkRequestService';
import theme from '../utils/theme';

function SentRequestsScreen() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await linkRequestService.getSentRequests();
      if (res.success) {
        setRequests(res.data?.requests || []);
      } else {
        Alert.alert('Error', res.message || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error loading sent requests:', error);
      Alert.alert('Error', 'Failed to load sent requests');
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

  const handleCancel = async (id) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (processingIds.has(id)) return;
            setProcessingIds((prev) => new Set([...prev, id]));
            try {
              const res = await linkRequestService.cancelRequest(id);
              if (res.success) {
                setRequests((prev) => prev.filter((r) => r.id !== id));
                Alert.alert('Success', 'Request cancelled successfully');
              } else {
                Alert.alert('Error', res.message || 'Failed to cancel request');
              }
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'accepted':
        return theme.colors.success;
      case 'rejected':
        return theme.colors.error;
      case 'cancelled':
        return theme.colors.textMuted;
      default:
        return theme.colors.textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'help-circle';
    }
  };

  const renderRequestItem = ({ item }) => {
    const parent = item.parent || {};
    const initials = (parent.name || parent.email || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    const busy = processingIds.has(item.id);
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{parent.name || parent.email || 'Unknown Parent'}</Text>
            <Text style={styles.email}>{parent.email || ''}</Text>
            {item.message && <Text style={styles.message}>{item.message}</Text>}
            <View style={styles.statusContainer}>
              <Ionicons name={statusIcon} size={16} color={statusColor} />
              <Text style={[styles.status, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            {item.requested_at && (
              <Text style={styles.date}>
                Sent {new Date(item.requested_at).toLocaleDateString()}
              </Text>
            )}
            {item.responded_at && (
              <Text style={styles.date}>
                Responded {new Date(item.responded_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.cancelButton, busy && styles.cancelButtonDisabled]}
            onPress={() => handleCancel(item.id)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <>
                <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                <Text style={styles.cancelText}>Cancel Request</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📤</Text>
      <Text style={styles.emptyTitle}>No sent requests</Text>
      <Text style={styles.emptyText}>
        You haven't sent any link requests yet. Tap the + button to send a request to a parent.
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
          <Text style={styles.loadingText}>Loading sent requests...</Text>
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
        <Text style={styles.headerTitle}>Sent Requests</Text>
        <View style={{ width: 32 }} />
      </View>

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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  status: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  date: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: 6,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.medium,
    fontSize: theme.fonts.sizes.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: 8,
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
    marginTop: 12,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
});

export default SentRequestsScreen;

