import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import linkRequestService from '../services/linkRequestService';
import theme from '../utils/theme';

function AddParentScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (message.length > 500) {
      newErrors.message = 'Message must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const res = await linkRequestService.sendRequestToParent(
        email.trim(),
        message.trim() || null
      );

      if (res.success) {
        Alert.alert(
          'Request Sent',
          'Your link request has been sent to the parent. They will receive a notification and can accept or reject your request.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to send request. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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
          <Text style={styles.headerTitle}>Add Parent</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Send a link request to a parent by entering their email address. They will receive
              a notification and can choose to accept or reject your request.
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Parent Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="parent@example.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({ ...errors, email: null });
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message (Optional)</Text>
            <TextInput
              style={[styles.textArea, errors.message && styles.inputError]}
              placeholder="Add a personal message to your request..."
              placeholderTextColor={theme.colors.textMuted}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                if (errors.message) {
                  setErrors({ ...errors, message: null });
                }
              }}
              multiline
              numberOfLines={4}
              maxLength={500}
              editable={!loading}
            />
            <Text style={styles.charCount}>{message.length}/500</Text>
            {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Send Request</Text>
              </>
            )}
          </TouchableOpacity>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => navigation.navigate('ScanParentQR')}
            >
              <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.qrButtonText}>Scan Parent QR Code</Text>
            </TouchableOpacity>
            <Text style={styles.qrHint}>
              Scan a QR code from your parent's SafetyNet app to send a link request
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 24,
    ...theme.shadows.sm,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: 8,
  },
  input: {
    ...theme.inputs.default,
    backgroundColor: '#fff',
    fontSize: theme.fonts.sizes.base,
  },
  textArea: {
    ...theme.inputs.default,
    backgroundColor: '#fff',
    fontSize: theme.fonts.sizes.base,
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.fonts.sizes.xs,
    marginTop: 4,
  },
  charCount: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
    ...theme.shadows.md,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  qrButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  qrHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AddParentScreen;

