import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import theme from '../utils/theme';

function LoginScreen({ navigation }) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation refs
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Logo animation - fade in and scale
    Animated.parallel([
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Text animation - fade in and slide up
    Animated.parallel([
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    // Reset error
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await login(email.trim(), password);

      if (result.success) {
        // Navigation will happen automatically via AppNavigator
        // when isLoggedIn state changes
        setError('');
      } else {
        // Show more detailed error message
        let errorMessage = result.message || 'Login failed. Please try again.';

        if (result.isNetworkError) {
          errorMessage = result.message || 'Cannot connect to server. Please check:\n1. Backend server is running\n2. IP address is correct in api.js\n3. Device and server are on the same network';
        }

        setError(errorMessage);
        console.error('Login failed:', result);
      }
    } catch (err) {
      const errorMessage = err.isNetworkError
        ? err.message || 'Network error. Please check server connection.'
        : 'An error occurred. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFE5F1', '#FFD6E8', '#FFC8DF', '#FFB6D6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: logoFadeAnim,
                    transform: [{ scale: logoScaleAnim }],
                  },
                ]}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logoIcon}
                  resizeMode="contain"
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.textContainer,
                  {
                    opacity: textFadeAnim,
                    transform: [{ translateY: textSlideAnim }],
                  },
                ]}
              >
                <Text style={styles.logoText}>SafetyNet</Text>
                <Text style={styles.subtitle}>Login to your account</Text>
              </Animated.View>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={theme.colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={showPassword ? require('../../assets/eye_open.png') : require('../../assets/eye_close.png')}
                      style={styles.eyeIconImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? (
                  <ActivityIndicator color={theme.colors.textWhite} />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signupLink}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLinkText}>Sign up here</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loginContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing['3xl'],
    borderRadius: theme.borderRadius['2xl'],
    ...theme.shadows.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  logoContainer: {
    marginBottom: theme.spacing.sm,
  },
  logoIcon: {
    width: 80,
    height: 80,
  },
  textContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.heading,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.background,
  },
  passwordInput: {
    flex: 1,
    padding: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
  },
  eyeIcon: {
    padding: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconImage: {
    width: 24,
    height: 24,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    color: '#ff4757',
    textAlign: 'center',
    fontSize: theme.fonts.sizes.sm,
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  input: {
    width: '100%',
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    backgroundColor: theme.colors.background,
  },
  loginButton: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
  signupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  signupText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  signupLinkText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
});

export default LoginScreen;
