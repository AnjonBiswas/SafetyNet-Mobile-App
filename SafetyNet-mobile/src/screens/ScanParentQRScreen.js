import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Camera } from 'expo-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import linkRequestService from '../services/linkRequestService';
import theme from '../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ScanParentQRScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      // Parse QR code data
      let qrData;
      let parentEmail = null;

      try {
        qrData = JSON.parse(data);
        console.log('Parsed QR data:', qrData);
        
        // Extract email from parsed data
        if (qrData.type === 'parent_link_request' && qrData.parent_email) {
          parentEmail = qrData.parent_email;
        } else if (qrData.parent_email) {
          parentEmail = qrData.parent_email;
        }
      } catch (e) {
        // If not JSON, treat as plain text (email)
        console.log('QR data is not JSON, treating as email:', data);
        parentEmail = data.trim();
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!parentEmail || !emailRegex.test(parentEmail)) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain a valid parent email address. Please scan a valid SafetyNet parent QR code.'
        );
        setScanned(false);
        setLoading(false);
        return;
      }

      // Use direct linking via QR code (automatic acceptance)
      // Extract parent_id and parent_name from QR data
      const parentId = qrData?.parent_id;
      const parentName = qrData?.parent_name || parentEmail;

      if (!parentId) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain valid parent information. Please scan a valid SafetyNet parent QR code.'
        );
        setScanned(false);
        setLoading(false);
        return;
      }

      // Use direct link (automatic acceptance, no request needed)
      const res = await linkRequestService.linkDirect(
        parentEmail,
        parentId,
        parentName
      );

      if (res.success) {
        Alert.alert(
          'Successfully Linked!',
          `You are now linked with ${parentName}. They can now monitor your location.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back - LinkedParentsScreen will auto-refresh via useFocusEffect
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        // Show detailed error message
        const errorMessage = res.message || 'Failed to send link request';
        const errorDetails = res.data?.errors?.parent_email 
          ? res.data.errors.parent_email.join(', ')
          : '';
        
        Alert.alert(
          'Error',
          errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage
        );
        setScanned(false);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      
      // Extract detailed error information
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process QR code';
      const errorDetails = error.response?.data?.errors?.parent_email
        ? error.response.data.errors.parent_email.join(', ')
        : '';
      
      Alert.alert(
        'Error',
        errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage
      );
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (hasPermission === false) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorText}>
            Please enable camera permission to scan QR codes.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={async () => {
              const { status } = await Camera.requestCameraPermissionsAsync();
              setHasPermission(status === 'granted');
            }}
          >
            <Text style={styles.backButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backButton, { marginTop: theme.spacing.md, backgroundColor: theme.colors.textMuted }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#000000', '#000000', '#1a1a1a']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Scanner */}
      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFillObject}
          type={Camera.Constants.Type.back}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeTypes={['qr']}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={[styles.overlaySection, styles.overlayTop]} />

          {/* Middle section with scanning area */}
          <View style={styles.middleSection}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.overlaySide} />
          </View>

          {/* Bottom overlay */}
          <View style={[styles.overlaySection, styles.overlayBottom]}>
            <Text style={styles.instructionText}>
              Position the QR code within the frame
            </Text>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rescan Button */}
      {scanned && !loading && (
        <View style={styles.rescanContainer}>
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={() => setScanned(false)}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.rescanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: '#fff',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayTop: {
    flex: 0,
    height: (SCREEN_HEIGHT - 300) / 2,
  },
  overlayBottom: {
    flex: 0,
    height: (SCREEN_HEIGHT - 300) / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['2xl'],
  },
  middleSection: {
    flexDirection: 'row',
    height: 300,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: 300,
    height: 300,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  loadingOverlay: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    marginTop: theme.spacing.sm,
  },
  rescanContainer: {
    padding: theme.spacing.base,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  errorTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.error,
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  backButtonText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
});

export default ScanParentQRScreen;

