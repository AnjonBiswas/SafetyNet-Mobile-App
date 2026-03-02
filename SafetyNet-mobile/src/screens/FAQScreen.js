import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import theme from '../utils/theme';

/**
 * FAQScreen
 * Frequently Asked Questions
 */
function FAQScreen() {
  const navigation = useNavigation();
  const [expandedItems, setExpandedItems] = useState(new Set());

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: 'rocket',
      questions: [
        {
          id: 'q1',
          question: 'How do I set up my profile?',
          answer:
            'Go to Profile > Edit Profile to add your personal information, emergency contacts, and profile picture. Make sure to add at least one trusted contact for emergency situations.',
        },
        {
          id: 'q2',
          question: 'How do I activate SOS?',
          answer:
            'Press and hold the SOS button on the dashboard for 3 seconds. The app will automatically send your location to trusted contacts and emergency services.',
        },
        {
          id: 'q3',
          question: 'What information is shared during an SOS?',
          answer:
            'During an SOS, your current location, a video recording (if enabled), and your emergency contacts are shared with your trusted contacts and emergency services.',
        },
      ],
    },
    {
      id: 'safety-features',
      title: 'Safety Features',
      icon: 'shield-checkmark',
      questions: [
        {
          id: 'q4',
          question: 'How does location sharing work?',
          answer:
            'Location sharing can be enabled in Settings > Location Settings. You can choose to share with trusted contacts, emergency services, or both. Location is only shared when you activate SOS or manually enable sharing.',
        },
        {
          id: 'q5',
          question: 'Can I report an incident anonymously?',
          answer:
            'Yes, you can choose to report incidents anonymously. However, providing your information helps authorities respond more effectively.',
        },
        {
          id: 'q6',
          question: 'How do I add trusted contacts?',
          answer:
            'Go to Profile > Trusted Contacts and tap the + button. Enter the contact\'s name and phone number. They will receive notifications during emergencies.',
        },
      ],
    },
    {
      id: 'reports',
      title: 'Reports & Incidents',
      icon: 'document-text',
      questions: [
        {
          id: 'q7',
          question: 'How do I file a report?',
          answer:
            'Go to Reports > New Report and fill in the incident details, location, and any evidence (photos/videos). You can submit the report immediately or save it as a draft.',
        },
        {
          id: 'q8',
          question: 'Can I edit or delete a report?',
          answer:
            'Yes, you can edit or delete your reports from the My Reports section. However, reports that have been submitted to authorities may have restrictions.',
        },
        {
          id: 'q9',
          question: 'What happens after I submit a report?',
          answer:
            'Your report is reviewed and forwarded to the appropriate authorities. You will receive updates on the status of your report through the app.',
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: 'lock-closed',
      questions: [
        {
          id: 'q10',
          question: 'Is my data secure?',
          answer:
            'Yes, all your data is encrypted and stored securely. We follow industry-standard security practices to protect your information.',
        },
        {
          id: 'q11',
          question: 'Who can see my location?',
          answer:
            'Only your trusted contacts and emergency services (when SOS is activated) can see your location. You have full control over location sharing in Settings.',
        },
        {
          id: 'q12',
          question: 'Can I delete my account?',
          answer:
            'Yes, you can delete your account from Settings > Privacy & Security > Delete Account. This will permanently delete all your data.',
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: 'construct',
      questions: [
        {
          id: 'q13',
          question: 'SOS button is not working',
          answer:
            'Make sure you have granted location permissions and added at least one trusted contact. Check your internet connection and try restarting the app.',
        },
        {
          id: 'q14',
          question: 'Location is not accurate',
          answer:
            'Ensure GPS is enabled on your device and you have a clear view of the sky. Try moving to an open area for better GPS signal.',
        },
        {
          id: 'q15',
          question: 'Notifications are not working',
          answer:
            'Check your device notification settings and ensure notifications are enabled for SafetyNet. Also check Alert Preferences in Settings.',
        },
      ],
    },
  ];

  const toggleQuestion = (categoryId, questionId) => {
    const key = `${categoryId}-${questionId}`;
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderQuestion = (categoryId, question) => {
    const key = `${categoryId}-${question.id}`;
    const isExpanded = expandedItems.has(key);
    const rotation = useSharedValue(isExpanded ? 180 : 0);

    React.useEffect(() => {
      rotation.value = withSpring(isExpanded ? 180 : 0);
    }, [isExpanded]);

    const chevronStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
      <View key={question.id} style={styles.questionContainer}>
        <TouchableOpacity
          style={styles.questionHeader}
          onPress={() => toggleQuestion(categoryId, question.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.questionText}>{question.question}</Text>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
          </Animated.View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.answerContainer}>
            <Text style={styles.answerText}>{question.answer}</Text>
          </View>
        )}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {faqCategories.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Ionicons name={category.icon} size={24} color={theme.colors.primary} />
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>
            <View style={styles.categoryCard}>
              {category.questions.map((question) => renderQuestion(category.id, question))}
            </View>
          </View>
        ))}

        {/* Contact Support CTA */}
        <View style={styles.ctaCard}>
          <Ionicons name="help-circle" size={32} color={theme.colors.primary} />
          <Text style={styles.ctaTitle}>Still have questions?</Text>
          <Text style={styles.ctaText}>
            Can't find what you're looking for? Contact our support team for assistance.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('ContactSupport')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
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
  categorySection: {
    marginBottom: theme.spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  categoryTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
  },
  categoryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  questionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    marginBottom: theme.spacing.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  questionText: {
    flex: 1,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginRight: theme.spacing.sm,
  },
  answerContainer: {
    paddingBottom: theme.spacing.md,
    paddingLeft: theme.spacing.xs,
  },
  answerText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  ctaCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.card,
  },
  ctaTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  ctaText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  ctaButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default FAQScreen;

