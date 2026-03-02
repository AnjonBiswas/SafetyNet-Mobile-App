import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../utils/theme';
import { useAuth } from '../context/AuthContext';

/**
 * ContactSupportScreen
 * Contact support team
 */
function ContactSupportScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const supportMethods = [
    {
      id: 'email',
      title: 'Email Support',
      description: 'support@safetynet.com',
      icon: 'mail',
      action: () => {
        const email = 'support@safetynet.com';
        const subject = encodeURIComponent('SafetyNet Support Request');
        const body = encodeURIComponent(
          `User: ${user?.name || 'User'}\nEmail: ${user?.email || 'N/A'}\n\nMessage:\n`
        );
        Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
      },
    },
    {
      id: 'phone',
      title: 'Phone Support',
      description: '+1 (555) 123-4567',
      icon: 'call',
      action: () => {
        Linking.openURL('tel:+15551234567');
      },
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Available 24/7',
      icon: 'chatbubbles',
      action: () => {
        Alert.alert('Live Chat', 'Live chat feature coming soon!');
      },
    },
  ];

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message');
      return;
    }

    try {
      setSending(true);
      // In a real app, you'd send this to your backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Message Sent',
        'Your message has been sent successfully. We will get back to you within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSubject('');
              setMessage('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderSupportMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={styles.supportMethodCard}
      onPress={method.action}
      activeOpacity={0.7}
    >
      <View style={styles.supportMethodLeft}>
        <View style={styles.supportMethodIcon}>
          <Ionicons name={method.icon} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.supportMethodText}>
          <Text style={styles.supportMethodTitle}>{method.title}</Text>
          <Text style={styles.supportMethodDescription}>{method.description}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Contact Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <View style={styles.card}>
            {supportMethods.map((method) => renderSupportMethod(method))}
          </View>
        </View>

        {/* Send Message Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter subject"
                placeholderTextColor={theme.colors.textMuted}
                value={subject}
                onChangeText={setSubject}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your issue or question..."
                placeholderTextColor={theme.colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              activeOpacity={0.8}
              disabled={sending}
            >
              <Ionicons
                name="send"
                size={20}
                color={theme.colors.textWhite}
                style={styles.sendButtonIcon}
              />
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Hours */}
        <View style={styles.infoCard}>
          <Ionicons name="time" size={24} color={theme.colors.info} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Support Hours</Text>
            <Text style={styles.infoText}>
              Monday - Friday: 9:00 AM - 6:00 PM{'\n'}
              Saturday: 10:00 AM - 4:00 PM{'\n'}
              Sunday: Closed
            </Text>
            <Text style={styles.infoNote}>
              Emergency support is available 24/7 for SOS-related issues.
            </Text>
          </View>
        </View>

        {/* FAQ Link */}
        <TouchableOpacity
          style={styles.faqLink}
          onPress={() => navigation.navigate('FAQ')}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle" size={20} color={theme.colors.primary} />
          <Text style={styles.faqLinkText}>Check our FAQ for common questions</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
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
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
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
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['2xl'],
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  supportMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  supportMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supportMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  supportMethodText: {
    flex: 1,
  },
  supportMethodTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: 2,
  },
  supportMethodDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
  },
  textArea: {
    height: 120,
    paddingTop: theme.spacing.md,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.sm,
    ...theme.shadows.md,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonIcon: {
    marginRight: theme.spacing.xs,
  },
  sendButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  infoNote: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    ...theme.shadows.sm,
  },
  faqLinkText: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
    marginLeft: theme.spacing.sm,
  },
});

export default ContactSupportScreen;

