import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import profileService from '../services/profileService';
import Input from '../components/Input';
import Button from '../components/Button';
import theme from '../utils/theme';

/**
 * EditProfileScreen
 * Allows users to edit their profile information and account settings
 */
function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    address: '',
    bloodGroup: '',
    profileImage: null,
  });

  // Settings state
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    locationSharingEnabled: true,
    language: 'English',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileResult, settingsResult] = await Promise.all([
        profileService.getProfile(),
        profileService.getSettings(),
      ]);

      if (profileResult.success) {
        setFormData({
          name: profileResult.data.name || '',
          phone: profileResult.data.phone || '',
          dob: profileResult.data.dob || '',
          address: profileResult.data.address || '',
          bloodGroup: profileResult.data.bloodGroup || '',
          profileImage: profileResult.data.profileImage || null,
        });
      }

      if (settingsResult.success) {
        setSettings(settingsResult.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.dob.trim()) {
      newErrors.dob = 'Date of birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData((prev) => ({ ...prev, profileImage: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your camera'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData((prev) => ({ ...prev, profileImage: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: handleCameraCapture },
        { text: 'Gallery', onPress: handleImagePicker },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    Alert.alert(
      'Save Changes',
      'Are you sure you want to save these changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            try {
              setSaving(true);
              const [profileResult, settingsResult] = await Promise.all([
                profileService.updateProfile(formData),
                profileService.updateSettings(settings),
              ]);

              if (profileResult.success && settingsResult.success) {
                // Update AuthContext user with new profile data
                // This ensures the DrawerMenu and other components show updated info
                // Email is always preserved from AuthContext, never changed
                await updateUser({
                  name: formData.name,
                  email: user?.email, // Always use AuthContext email (never change it)
                  profileImage: formData.profileImage, // Include profile image
                });

                Alert.alert('Success', 'Profile updated successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert(
                  'Error',
                  profileResult.message || settingsResult.message || 'Failed to update profile'
                );
              }
            } catch (error) {
              console.error('Error saving profile:', error);
              Alert.alert('Error', 'Failed to save profile');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: theme.colors.border };
    if (password.length < 8) return { strength: 1, label: 'Weak', color: theme.colors.error };
    if (password.length < 12) return { strength: 2, label: 'Medium', color: theme.colors.warning };
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return { strength: 4, label: 'Very Strong', color: theme.colors.success };
    }
    return { strength: 3, label: 'Strong', color: theme.colors.info };
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setSaving(true);
      // Validate current password
      const validateResult = await profileService.validatePassword(
        passwordData.currentPassword
      );

      if (!validateResult.success) {
        setPasswordErrors({ currentPassword: 'Current password is incorrect' });
        setSaving(false);
        return;
      }

      // Update password
      const updateResult = await profileService.updatePassword(passwordData.newPassword);

      if (updateResult.success) {
        Alert.alert('Success', 'Password updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              setShowPasswordModal(false);
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
              });
              setPasswordErrors({});
            },
          },
        ]);
      } else {
        Alert.alert('Error', updateResult.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

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
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={showImagePickerOptions}
            activeOpacity={0.8}
          >
            {formData.profileImage ? (
              <Image source={{ uri: formData.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(formData.name)}</Text>
              </View>
            )}
            <View style={styles.editImageBadge}>
              <Ionicons name="camera" size={20} color={theme.colors.textWhite} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profilePictureHint}>Tap to change photo</Text>
        </View>

        {/* Personal Information Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          <View style={styles.cardContent}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              error={errors.name}
            />
            <Input
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
              error={errors.phone}
            />
            <Input
              label="Date of Birth"
              placeholder="YYYY-MM-DD"
              value={formData.dob}
              onChangeText={(value) => handleInputChange('dob', value)}
              error={errors.dob}
            />
            <Input
              label="Address (Optional)"
              placeholder="Enter your address"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              multiline
              numberOfLines={3}
              error={errors.address}
            />
            <Input
              label="Blood Group (Optional)"
              placeholder="e.g., O+, A-, B+"
              value={formData.bloodGroup}
              onChangeText={(value) => handleInputChange('bloodGroup', value)}
              error={errors.bloodGroup}
            />
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Account Settings</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive alerts and updates
                </Text>
              </View>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, notificationsEnabled: value }))
                }
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={settings.notificationsEnabled ? theme.colors.primary : theme.colors.border}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Location Sharing</Text>
                <Text style={styles.settingDescription}>
                  Share location with trusted contacts
                </Text>
              </View>
              <Switch
                value={settings.locationSharingEnabled}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, locationSharingEnabled: value }))
                }
                trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                thumbColor={settings.locationSharingEnabled ? theme.colors.primary : theme.colors.border}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Language Preference</Text>
                <Text style={styles.settingDescription}>
                  {settings.language}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => {
                  const languages = ['English', 'বাংলা'];
                  const currentIndex = languages.indexOf(settings.language);
                  const nextIndex = (currentIndex + 1) % languages.length;
                  setSettings((prev) => ({ ...prev, language: languages[nextIndex] }));
                }}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Password Change Button */}
        <TouchableOpacity
          style={styles.passwordButton}
          onPress={() => setShowPasswordModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.passwordButtonText}>Change Password</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Input
                label="Current Password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChangeText={(value) =>
                  setPasswordData((prev) => ({ ...prev, currentPassword: value }))
                }
                secureTextEntry
                error={passwordErrors.currentPassword}
              />
              <Input
                label="New Password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChangeText={(value) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: value }))
                }
                secureTextEntry
                error={passwordErrors.newPassword}
              />
              {passwordData.newPassword ? (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View
                      style={[
                        styles.passwordStrengthFill,
                        {
                          width: `${(passwordStrength.strength / 4) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              ) : null}
              <Input
                label="Confirm Password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChangeText={(value) =>
                  setPasswordData((prev) => ({ ...prev, confirmPassword: value }))
                }
                secureTextEntry
                error={passwordErrors.confirmPassword}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setPasswordErrors({});
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title="Update Password"
                onPress={handlePasswordChange}
                loading={saving}
                style={styles.modalSaveButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  profilePictureHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
  },
  cardContent: {
    paddingTop: theme.spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  languageButton: {
    padding: theme.spacing.xs,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  passwordButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    marginLeft: theme.spacing.sm,
  },
  saveButton: {
    marginTop: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
    maxHeight: '80%',
    paddingBottom: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalScroll: {
    padding: theme.spacing.lg,
  },
  passwordStrengthContainer: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  modalSaveButton: {
    flex: 1,
  },
});

export default EditProfileScreen;

