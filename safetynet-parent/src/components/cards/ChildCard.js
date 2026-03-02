import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../common/Card';
import theme from '../../utils/theme';

const ChildCard = ({ child, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card elevated>
        <View style={styles.content}>
          <View style={styles.info}>
            <Text style={styles.name}>{child.full_name || child.name}</Text>
            <Text style={styles.status}>
              {child.status === 'active' ? '● Active' : '● Inactive'}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  status: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
});

export default ChildCard;

