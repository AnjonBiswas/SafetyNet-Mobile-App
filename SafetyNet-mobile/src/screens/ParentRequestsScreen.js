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
import { parentLinkService } from '../services';
import theme from '../utils/theme';

function ParentRequestsScreen() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await parentLinkService.getLinkRequests();
      if (res.success) {
        setRequests(res.data || []);
      } else {
        Alert.alert('Error', res.message || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error loading parent link requests:', error);
      Alert.alert('Error', 'Failed to load parent requests');
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
      const res = await parentLinkService.acceptLink(id);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        Alert.alert('Linked', 'Parent has been linked to your account.');
      } else {
        Alert.alert('Error', res.message || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting parent link request:', error);
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
    setProcessingIds((prev) => new Set([...prev, id]));
    try {
      const res = await parentLinkService.rejectLink(id);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
      } else {
        Alert.alert('Error', res.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting parent link request:', error);
      Alert.alert('Error', 'Failed to reject request');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const renderRequestItem = ({ item }) => {
    const parent = item.parent || {};
    const initials = (parent.name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    const busy = processingIds.has(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{parent.name || 'Unknown Parent'}</Text>
            <Text style={styles.email}>{parent.email || ''}</Text>
            <Text style={styles.message}>
              {item.message || 'wants to link with your SafetyNet account.'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAccept(item.id)}
            disabled={busy}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
            disabled={busy}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>👨‍👩‍👧</Text>
      <Text style={styles.emptyTitle}>No pending requests</Text>
      <Text style={styles.emptyText}>
        When a parent wants to monitor your safety, their request will appear here.
        You can choose to accept or reject any request.
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
          <Text style={styles.loadingText}>Loading parent requests...</Text>
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
        <Text style={styles.headerTitle}>Parent Requests</Text>
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
          <Text style={styles.infoTitle}>You are in control</Text>
          <Text style={styles.infoText}>
            Parents can request to link with your SafetyNet account to help monitor your
            safety. You decide who to trust. You can unlink at any time.
          </Text>
        </View>

        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequestItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
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
  },
  cardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  email: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  message: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  acceptText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
  },
  rejectText: {
    color: theme.colors.textDark,
    fontSize: theme.fonts.sizes.sm,
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

export default ParentRequestsScreen;


