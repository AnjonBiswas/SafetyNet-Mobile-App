import React from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import theme from '../utils/theme'

/**
 * Reusable Input
 * Props:
 * - label: string
 * - placeholder: string
 * - value: string
 * - onChangeText: function
 * - secureTextEntry: boolean
 * - error: string
 */
function Input({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  error = '',
  ...rest
}) {
  const showError = !!error
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, showError && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {showError ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
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
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.error,
    fontSize: theme.fonts.sizes.sm,
  },
})

export default Input
