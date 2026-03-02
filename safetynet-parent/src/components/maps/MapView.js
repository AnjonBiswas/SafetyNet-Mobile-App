import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';
import theme from '../../utils/theme';

const SafetyNetMapView = ({ children, ...props }) => {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        {...props}
      >
        {children}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default SafetyNetMapView;

