import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../utils/theme';
import { useAuth } from '../context/AuthContext';

/**
 * ReportBugScreen
 * Report bugs and issues
 */
function ReportBugScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [bugType, setBugType] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bugTypes = [
    { id: 'crash', label: 'App Crash', icon: 'warning' },
    { id: 'feature', label: 'Feature Not Working', icon: 'construct' },
    { id: 'ui', label: 'UI/Display Issue', icon: 'phone-portrait' },
    { id: 'performance', label: 'Performance Issue', icon: 'speedometer' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
  ];

  const getDeviceInfo = () => {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      deviceModel: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
      appVersion: '1.0.0',
    };
  };

  const handleSubmit = async () => {
    if (!bugType) {
      Alert.alert('Error', 'Please select a bug type');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of the bug');
      return;
    }

    try {
      setSubmitting(true);
      
      const deviceInfo = getDeviceInfo();
      const bugReport = {
        type: bugType,
        description,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        user: {
          name: user?.name,
          email: user?.email,
        },
        device: deviceInfo,
        timestamp: new Date().toISOString(),
      };

      // In a real app, you'd send this to your backend
      console.log('Bug Report:', bugReport);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Bug Reported',
        'Thank you for reporting this bug. Our team will review it and work on a fix.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setBugType('');
              setDescription('');
              setStepsToReproduce('');
              setExpectedBehavior('');
              setActualBehavior('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert('Error', 'Failed to submit bug report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBugTypeOption = (type) => {
    const isSelected = bugType === type.id;
    return (
      <TouchableOpacity
        key={type.id}
        style={[styles.bugTypeOption, isSelected && styles.bugTypeOptionSelected]}
        onPress={() => setBugType(type.id)}
        activeOpacity={0.7}
      >
        <View style={styles.bugTypeLeft}>
          <View
            style={[
              styles.bugTypeIcon,
              isSelected && styles.bugTypeIconSelected,
            ]}
          >
            <Ionicons
              name={type.icon}
              size={20}
              color={isSelected ? theme.colors.primary : theme.colors.textMuted}
            />
          </View>
          <Text
            style={[
              styles.bugTypeLabel,
              isSelected && styles.bugTypeLabelSelected,
            ]}
          >
            {type.label}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Report a Bug</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bug Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bug Type</Text>
          <View style={styles.card}>
            {bugTypes.map((type) => renderBugTypeOption(type))}
          </View>
        </View>

        {/* Bug Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Describe the bug <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide a clear description of the bug..."
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Steps to Reproduce */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps to Reproduce</Text>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>How can we reproduce this bug?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="1. Step one...&#10;2. Step two...&#10;3. Step three..."
                placeholderTextColor={theme.colors.textMuted}
                value={stepsToReproduce}
                onChangeText={setStepsToReproduce}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Expected vs Actual Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected vs Actual Behavior</Text>
          <View style={styles.card}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Expected Behavior</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What should happen?"
                placeholderTextColor={theme.colors.textMuted}
                value={expectedBehavior}
                onChangeText={setExpectedBehavior}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Actual Behavior</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What actually happens?"
                placeholderTextColor={theme.colors.textMuted}
                value={actualBehavior}
                onChangeText={setActualBehavior}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Device Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Device Information</Text>
            <Text style={styles.infoText}>
              The following information will be automatically included with your report:
            </Text>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceInfoText}>
                Platform: {Platform.OS} {Platform.Version}
              </Text>
              <Text style={styles.deviceInfoText}>
                Device: {Platform.OS === 'ios' ? 'iOS Device' : 'Android Device'}
              </Text>
              <Text style={styles.deviceInfoText}>App Version: 1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={submitting}
        >
          <Ionicons
            name="bug"
            size={20}
            color={theme.colors.textWhite}
            style={styles.submitButtonIcon}
          />
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Bug Report'}
          </Text>
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
  bugTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  bugTypeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundLight,
  },
  bugTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bugTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  bugTypeIconSelected: {
    backgroundColor: theme.colors.primary + '20',
  },
  bugTypeLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
  },
  bugTypeLabelSelected: {
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.primary,
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
  required: {
    color: theme.colors.error,
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
    height: 100,
    paddingTop: theme.spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.sm,
  },
  deviceInfo: {
    marginTop: theme.spacing.xs,
  },
  deviceInfoText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonIcon: {
    marginRight: theme.spacing.xs,
  },
  submitButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default ReportBugScreen;

