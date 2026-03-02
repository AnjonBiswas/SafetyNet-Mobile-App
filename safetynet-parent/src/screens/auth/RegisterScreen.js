import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import theme from '../../utils/theme';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register, isLoading, isAuthenticated } = useAuth();

  // Note: Navigation is handled automatically by AppNavigator based on isAuthenticated state
  // This useEffect is just for debugging
  useEffect(() => {
    if (isAuthenticated) {
      console.log('RegisterScreen: User authenticated, should navigate to dashboard');
    }
  }, [isAuthenticated]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    general: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      general: '',
    };

    let isValid = true;

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Phone validation (optional but if provided, should be valid)
    if (formData.phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain both uppercase and lowercase letters';
      isValid = false;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handle registration
   */
  const handleRegister = async () => {
    // Clear previous errors
    setErrors({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      general: '',
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      const parentData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        password_confirmation: formData.confirmPassword, // Add password confirmation
        phone: formData.phone.trim() || null,
      };

      const result = await register(parentData);

      if (result.success) {
        console.log('Registration successful, result:', result);
        // Navigation will happen automatically via AppNavigator when isAuthenticated changes
        // No need to navigate manually - the conditional rendering handles it
      } else {
        console.log('Registration failed:', result.message);
        setErrors((prev) => ({
          ...prev,
          general: result.message || 'Registration failed. Please try again.',
        }));
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle network errors with better messaging
      if (error.isNetworkError || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        const networkErrorMsg = error.message || 'Network error: Cannot connect to server.';
        setErrors((prev) => ({
          ...prev,
          general: `${networkErrorMsg}\n\nPlease check:\n• Backend server is running\n• IP address is correct (${error.apiUrl || 'http://192.168.0.4:8000/api'})\n• Device and server are on the same WiFi network\n• Firewall is not blocking the connection`,
        }));
      } else {
        // Handle other errors
        const errorMessage = error.message || 
          (error.data?.message) || 
          (error.data?.errors ? Object.values(error.data.errors).flat().join(', ') : null) ||
          'An error occurred. Please try again.';
        setErrors((prev) => ({
          ...prev,
          general: errorMessage,
        }));
      }
    }
  };

  /**
   * Update form field
   */
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    // Clear general error
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: '' }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join SafetyNet to keep your children safe
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          {/* General Error Message */}
          {errors.general ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

          {/* Name Input */}
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            autoCapitalize="words"
            autoCorrect={false}
            error={errors.name}
            editable={!isLoading}
          />

          {/* Email Input */}
          <Input
            label="Email Address"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            editable={!isLoading}
          />

          {/* Phone Input */}
          <Input
            label="Phone Number (Optional)"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChangeText={(value) => updateField('phone', value)}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.phone}
            editable={!isLoading}
          />

          {/* Password Input */}
          <View style={styles.passwordContainer}>
            <Input
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.password}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              <Text style={styles.showPasswordText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Password Requirements */}
          {formData.password ? (
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <View style={styles.requirementItem}>
                <Text
                  style={[
                    styles.requirementText,
                    formData.password.length >= 6 && styles.requirementMet,
                  ]}
                >
                  • At least 6 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Text
                  style={[
                    styles.requirementText,
                    /(?=.*[a-z])/.test(formData.password) && styles.requirementMet,
                  ]}
                >
                  • Lowercase letter
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Text
                  style={[
                    styles.requirementText,
                    /(?=.*[A-Z])/.test(formData.password) && styles.requirementMet,
                  ]}
                >
                  • Uppercase letter
                </Text>
              </View>
            </View>
          ) : null}

          {/* Confirm Password Input */}
          <View style={styles.passwordContainer}>
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.confirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              <Text style={styles.showPasswordText}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
          />

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.fonts.sizes['4xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.base,
  },
  errorText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.medium,
    lineHeight: 20,
  },
  passwordContainer: {
    position: 'relative',
  },
  showPasswordButton: {
    position: 'absolute',
    right: theme.spacing.base,
    top: 35,
    padding: theme.spacing.xs,
  },
  showPasswordText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  requirementsContainer: {
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.base,
    marginTop: -theme.spacing.sm,
  },
  requirementsTitle: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  requirementItem: {
    marginTop: theme.spacing.xs / 2,
  },
  requirementText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
  },
  requirementMet: {
    color: theme.colors.success,
    fontWeight: theme.fonts.weights.medium,
  },
  registerButton: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.base,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  loginText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  loginLink: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  footer: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.base,
  },
  footerText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RegisterScreen;
