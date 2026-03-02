// Web-compatible stub for react-native-maps
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Stub MapView component for web
export const MapView = ({ children, style, ...props }) => {
  return (
    <View style={[styles.mapContainer, style]}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Map View</Text>
        <Text style={styles.placeholderSubtext}>
          Maps are not available on web platform
        </Text>
      </View>
      {children}
    </View>
  );
};

// Stub Marker component
export const Marker = ({ children, ...props }) => {
  return <View>{children}</View>;
};

// Stub Circle component
export const Circle = ({ children, ...props }) => {
  return <View>{children}</View>;
};

// Stub Polyline component
export const Polyline = ({ children, ...props }) => {
  return <View>{children}</View>;
};

// Stub PROVIDER_GOOGLE constant
export const PROVIDER_GOOGLE = 'google';

// Default export
export default MapView;

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

