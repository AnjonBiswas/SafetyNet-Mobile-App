import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { childrenService } from '../../services';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import theme from '../../utils/theme';

const LinkChildScreen = () => {
  const navigation = useNavigation();
  const [emailOrCode, setEmailOrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState('');

  /**
   * Fetch pending link requests
   */
  const fetchPendingRequests = async () => {
    try {
      const response = await childrenService.getChildren();
      if (response.success) {
        // Handle different response structures
        let childrenList = [];
        if (Array.isArray(response.data)) {
          childrenList = response.data;
        } else if (response.data?.children && Array.isArray(response.data.children)) {
          childrenList = response.data.children;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          childrenList = response.data.data;
        }
        
        // Filter pending requests
        const pending = childrenList.filter((child) => child.status === 'pending');
        setPendingRequests(pending);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setPendingRequests([]);
    }
  };

  /**
   * Load pending requests on mount and when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
    }, [])
  );

  /**
   * Validate input
   */
  const validateInput = () => {
    if (!emailOrCode.trim()) {
      setError('Please enter child\'s email or link code');
      return false;
    }

    // Check if it's an email or code
    const isEmail = emailOrCode.includes('@');
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrCode.trim())) {
      setError('Please enter a valid email address');
      return false;
    }

    setError('');
    return true;
  };

  /**
   * Handle send link request
   */
  const handleSendRequest = async () => {
    if (!validateInput()) {
      return;
    }

    try {
      setLoading(true);
      const response = await childrenService.linkChild(emailOrCode.trim());

      if (response.success) {
        Alert.alert(
          'Request Sent',
          'Link request has been sent to the child. They will receive a notification to accept or reject the request.',
          [
            {
              text: 'OK',
              onPress: () => {
                setEmailOrCode('');
                fetchPendingRequests();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to send link request. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send link request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'active':
        return theme.colors.success;
      case 'revoked':
        return theme.colors.error;
      default:
        return theme.colors.textMuted;
    }
  };

  /**
   * Get status text
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'active':
        return 'Active';
      case 'revoked':
        return 'Revoked';
      default:
        return status;
    }
  };

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
          <Text style={styles.headerTitle}>Link a Child</Text>
          <Text style={styles.headerSubtitle}>
            Connect with your child's SafetyNet account to monitor their safety
          </Text>
        </View>

        {/* Explanation Card */}
        <View style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>How it works:</Text>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>1.</Text>
            <Text style={styles.explanationText}>
              Enter your child's email address or link code
            </Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>2.</Text>
            <Text style={styles.explanationText}>
              A link request will be sent to your child's app
            </Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>3.</Text>
            <Text style={styles.explanationText}>
              Your child needs to accept the request in their SafetyNet app
            </Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationBullet}>4.</Text>
            <Text style={styles.explanationText}>
              Once accepted, you can monitor their location and safety
            </Text>
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <Input
            label="Child's Email or Link Code"
            placeholder="Enter email (e.g., child@example.com) or link code"
            value={emailOrCode}
            onChangeText={(value) => {
              setEmailOrCode(value);
              if (error) setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            editable={!loading}
          />

          <Button
            title="Send Link Request"
            onPress={handleSendRequest}
            loading={loading}
            disabled={loading}
            style={styles.sendButton}
          />
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <Button
            title="Generate QR Code"
            onPress={() => navigation.navigate('GenerateQRCode')}
            variant="secondary"
            style={styles.qrButton}
          />
          <Text style={styles.qrHint}>
            Generate a QR code that your child can scan to send you a link request
          </Text>
        </View>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.pendingCard}>
                <View style={styles.pendingCardContent}>
                  <View style={styles.pendingCardLeft}>
                    <View style={styles.pendingAvatar}>
                      <Text style={styles.pendingInitials}>
                        {(request.child?.full_name || request.child?.name || 'C')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingName}>
                        {request.child?.full_name || request.child?.name || 'Unknown'}
                      </Text>
                      <Text style={styles.pendingEmail}>
                        {request.child?.email || 'No email'}
                      </Text>
                      <Text style={styles.pendingDate}>
                        Requested {formatDate(request.created_at)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(request.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[styles.statusBadgeText, { color: getStatusColor(request.status) }]}
                    >
                      {getStatusText(request.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

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
  explanationCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  explanationTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  explanationItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  explanationBullet: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
    width: 20,
  },
  explanationText: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: theme.spacing.xl,
  },
  sendButton: {
    marginTop: theme.spacing.md,
  },
  pendingSection: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  pendingCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingCardLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  pendingAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#cfe9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  pendingInitials: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  pendingEmail: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  pendingDate: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
  },
  statusBadgeText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
  },
  bottomSpacing: {
    height: theme.spacing['2xl'],
  },
  qrSection: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.base,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  qrButton: {
    marginBottom: theme.spacing.sm,
  },
  qrHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LinkChildScreen;
