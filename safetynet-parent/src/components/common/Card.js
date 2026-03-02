import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../utils/theme';

const Card = ({ children, style, elevated = false }) => {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...theme.cards.default,
    marginBottom: theme.spacing.base,
  },
  elevated: {
    ...theme.shadows.card,
  },
});

export default Card;

