import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../utils/theme';
import settingsService from '../services/settingsService';

/**
 * LanguageSelectionScreen
 * Select app language
 */
function LanguageSelectionScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const languages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
    },
    {
      code: 'bn',
      name: 'Bengali',
      nativeName: 'বাংলা',
      flag: '🇧🇩',
    },
  ];

  useEffect(() => {
    loadCurrentLanguage();
  }, []);

  const loadCurrentLanguage = async () => {
    try {
      setLoading(true);
      const appSettings = await settingsService.getSettingCategory('app');
      setSelectedLanguage(appSettings.language || 'en');
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSelect = async (languageCode) => {
    if (languageCode === selectedLanguage) return;

    try {
      setSaving(true);
      setSelectedLanguage(languageCode);
      await settingsService.updateSettings('app', { language: languageCode });
      
      Alert.alert(
        'Language Changed',
        'Please restart the app for the language change to take full effect.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving language:', error);
      Alert.alert('Error', 'Failed to save language preference');
    } finally {
      setSaving(false);
    }
  };

  const renderLanguageOption = (language) => {
    const isSelected = selectedLanguage === language.code;
    return (
      <TouchableOpacity
        key={language.code}
        style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
        onPress={() => handleLanguageSelect(language.code)}
        activeOpacity={0.7}
        disabled={saving}
      >
        <View style={styles.languageOptionLeft}>
          <Text style={styles.languageFlag}>{language.flag}</Text>
          <View style={styles.languageTextContainer}>
            <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
              {language.name}
            </Text>
            <Text style={styles.languageNativeName}>{language.nativeName}</Text>
          </View>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
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
          <Text style={styles.loadingText}>Loading languages...</Text>
        </View>
      </LinearGradient>
    );
  }

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
        <Text style={styles.headerTitle}>Language Selection</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info} />
          <Text style={styles.infoText}>
            Select your preferred language. The app will restart to apply the changes.
          </Text>
        </View>

        {/* Language Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Languages</Text>
          <View style={styles.card}>
            {languages.map((language) => renderLanguageOption(language))}
          </View>
        </View>

        {/* Language Info */}
        <View style={styles.helpCard}>
          <Ionicons name="help-circle" size={24} color={theme.colors.primary} />
          <View style={styles.helpTextContainer}>
            <Text style={styles.helpTitle}>Need another language?</Text>
            <Text style={styles.helpText}>
              If you'd like to see SafetyNet in another language, please contact our support team.
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.info,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
    lineHeight: 20,
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
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  languageOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundLight,
  },
  languageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: 4,
  },
  languageNameSelected: {
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
  languageNativeName: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  selectedIndicator: {
    marginLeft: theme.spacing.sm,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  helpTextContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  helpTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  helpText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});

export default LanguageSelectionScreen;

