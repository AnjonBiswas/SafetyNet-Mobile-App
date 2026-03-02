import React, { useEffect, useState } from 'react';
import { Circle } from 'react-native-maps';

/**
 * SafeZoneCircle Component
 * 
 * Displays a blinking circle on the map representing a safe zone.
 * The circle pulses between opacity 0.3 and 0.6 with smooth animation.
 * 
 * @param {Object} zone - Safe zone data object
 * @param {number} zone.latitude - Latitude coordinate
 * @param {number} zone.longitude - Longitude coordinate
 * @param {number} zone.radius - Radius in meters
 * @param {string} zone.risk_level - Risk level: 'green', 'orange', or 'red'
 * @param {Function} onPress - Callback when circle is pressed
 */
const SafeZoneCircle = ({ zone, onPress }) => {
  // Color mapping based on risk level
  const getColor = (riskLevel) => {
    switch (riskLevel) {
      case 'green':
        return { r: 0, g: 255, b: 0 }; // Green - Safe area
      case 'orange':
        return { r: 255, g: 165, b: 0 }; // Orange - Medium risk
      case 'red':
        return { r: 255, g: 0, b: 0 }; // Red - High risk
      default:
        return { r: 128, g: 128, b: 128 }; // Gray - Unknown
    }
  };

  // Blinking animation - pulses between 0.4 and 0.7 opacity (more visible)
  const [currentOpacity, setCurrentOpacity] = useState(0.4);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOpacity((prev) => (prev === 0.4 ? 0.7 : 0.4));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Get color with current opacity
  const getColorWithOpacity = () => {
    const { r, g, b } = getColor(zone.risk_level);
    return `rgba(${r}, ${g}, ${b}, ${currentOpacity})`;
  };

  // Get stroke color (slightly more opaque)
  const getStrokeColor = () => {
    const { r, g, b } = getColor(zone.risk_level);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  };

  const centerLat = parseFloat(zone.latitude);
  const centerLng = parseFloat(zone.longitude);
  const circleRadius = zone.radius || 400;

  // Validate coordinates
  if (isNaN(centerLat) || isNaN(centerLng)) {
    console.error(`[SafeZoneCircle] Invalid coordinates for zone ${zone.id}:`, zone);
    return null;
  }

  return (
    <Circle
      center={{
        latitude: centerLat,
        longitude: centerLng,
      }}
      radius={circleRadius}
      fillColor={getColorWithOpacity()}
      strokeColor={getStrokeColor()}
      strokeWidth={4}
      onPress={onPress}
      tappable={true}
      zIndex={1}
    />
  );
};

export default React.memo(SafeZoneCircle);
