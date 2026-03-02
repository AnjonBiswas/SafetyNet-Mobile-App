import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import theme from '../../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH - 80;

/**
 * Simple QR Code Generator using SVG
 * For production, consider using react-native-qrcode-svg
 */
const generateQRCode = (data) => {
  // This is a simplified QR code representation
  // For production, use a proper QR code library like react-native-qrcode-svg
  // For now, we'll create a simple pattern
  const qrData = JSON.stringify(data);
  return qrData;
};

function GenerateQRCodeScreen() {
  const navigation = useNavigation();
  const { parent, refreshProfile } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      if (!parent) {
        return;
      }

      // Helper function to extract email from various possible structures
      const getEmail = (parentObj) => {
        if (!parentObj) return null;
        
        // Try direct email field
        if (parentObj.email) return parentObj.email;
        
        // Try nested parent.email (if parent is wrapped)
        if (parentObj.parent?.email) return parentObj.parent.email;
        
        // Try other possible field names
        if (parentObj.parent_email) return parentObj.parent_email;
        if (parentObj.user?.email) return parentObj.user.email;
        
        return null;
      };

      // Helper function to extract parent data (handle nested structure)
      const getParentData = (parentObj) => {
        if (!parentObj) return null;
        
        // If parent is nested (parent.parent), use the inner parent
        if (parentObj.parent && typeof parentObj.parent === 'object') {
          return parentObj.parent;
        }
        
        // Otherwise use parent directly
        return parentObj;
      };

      // Debug: Log parent object to see its structure
      console.log('Parent object:', JSON.stringify(parent, null, 2));
      
      // Get the actual parent data (handle nested structure)
      const actualParent = getParentData(parent);
      
      // Try to get email from various possible fields
      let parentEmail = getEmail(parent);
      let currentParent = actualParent || parent;
      
      // If email is missing, try to refresh profile from server
      if (!parentEmail || !parentEmail.trim()) {
        console.log('Email not found in parent object, refreshing profile...');
        setIsRefreshing(true);
        try {
          const refreshResult = await refreshProfile();
          if (refreshResult.success && refreshResult.data) {
            // Use the refreshed parent data
            const refreshedParent = getParentData(refreshResult.data);
            currentParent = refreshedParent || refreshResult.data;
            parentEmail = getEmail(refreshResult.data);
            console.log('Refreshed parent email:', parentEmail);
            console.log('Refreshed parent data:', JSON.stringify(refreshResult.data, null, 2));
          } else {
            setIsRefreshing(false);
            Alert.alert(
              'Error',
              'Could not retrieve parent email. Please check your profile and try again.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            );
            return;
          }
        } catch (error) {
          console.error('Error refreshing profile:', error);
          setIsRefreshing(false);
          Alert.alert(
            'Error',
            'Could not retrieve parent email. Please check your profile and try again.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
          return;
        }
      }
      
      // Validate we have email before generating
      if (!parentEmail || !parentEmail.trim()) {
        console.error('Parent email still missing. Parent object:', JSON.stringify(currentParent, null, 2));
        setIsRefreshing(false);
        Alert.alert(
          'Error',
          'Parent email is missing. Please update your profile with a valid email address and try again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return;
      }

      // Generate QR code data with parent info
      const data = {
        type: 'parent_link_request',
        parent_id: currentParent?.id || parent?.id,
        parent_email: parentEmail.trim(),
        parent_name: currentParent?.name || currentParent?.full_name || parent?.name || 'Parent',
        timestamp: Date.now(),
      };
      console.log('Generating QR code with data:', data);
      setQrData(JSON.stringify(data));
      setIsRefreshing(false);
    };

    generateQR();
  }, [parent, refreshProfile, navigation]);

  const handleShare = async () => {
    if (!qrData) return;

    try {
      await Share.share({
        message: `Scan this QR code to link with ${parent?.name || 'me'} on SafetyNet.\n\nQR Data: ${qrData}`,
        title: 'SafetyNet Parent Link',
      });
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  if (!parent) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Show this QR code to your child. They can scan it with their SafetyNet app to send you a link request.
          </Text>
        </View>

        {/* QR Code Display */}
        <View style={styles.qrContainer}>
          <View style={styles.qrCode}>
            {qrData ? (
              <QRCode
                value={qrData}
                size={QR_SIZE - 40}
                color={theme.colors.textDark}
                backgroundColor="#fff"
                logo={null}
                logoSize={0}
                logoBackgroundColor="transparent"
                logoMargin={0}
                logoBorderRadius={0}
                quietZone={10}
              />
            ) : (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            )}
          </View>
          <Text style={styles.qrHint}>
            Have your child scan this QR code with their SafetyNet app
          </Text>
        </View>

        {/* Parent Info */}
        <View style={styles.parentInfo}>
          <Text style={styles.parentName}>{parent.name}</Text>
          <Text style={styles.parentEmail}>{parent.email}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.shareButtonText}>Share QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  infoText: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  qrCode: {
    width: QR_SIZE,
    height: QR_SIZE,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.base,
    ...theme.shadows.lg,
  },
  qrHint: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.base,
  },
  parentInfo: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  parentName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  parentEmail: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
  },
  actions: {
    marginBottom: theme.spacing.xl,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  shareButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
  },
});

export default GenerateQRCodeScreen;

