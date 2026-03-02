import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import theme from '../../utils/theme';

const Input = ({ label, error, ...props }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={theme.colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.base,
  },
  label: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  input: {
    ...theme.inputs.default,
    backgroundColor: theme.colors.background,
  },
  inputError: {
    ...theme.inputs.error,
  },
  errorText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});

export default Input;

