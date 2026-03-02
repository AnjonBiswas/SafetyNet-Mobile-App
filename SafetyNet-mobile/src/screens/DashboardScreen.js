import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, Alert, Linking, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Location from 'expo-location'
import * as SMS from 'expo-sms'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import theme from '../utils/theme'
import { startSOS, stopSOS } from '../services/sosService'
import { getRecordingStatus } from '../services/cameraService'
import HiddenCamera from '../components/HiddenCamera'
import BottomNav from '../components/BottomNav'
import AddTrustedContactModal from '../components/AddTrustedContactModal'
import WomenSafetyNewsCards from '../components/WomenSafetyNewsCards'
import trustedContactService from '../services/trustedContactService'
import locationSharingService from '../services/locationSharingService'
import { useAuth } from '../context/AuthContext'

const resources = [
  { title: 'Legal Rights', desc: 'Know your rights and legal protections' },
  { title: 'Self-Defense Tips', desc: 'Learn basic self-defense techniques' },
  { title: 'Warning Signs', desc: 'Recognize dangerous situations early' },
]

function DashboardScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()
  const glowAnim = useRef(new Animated.Value(0)).current
  const [sosActive, setSosActive] = useState(false)
  const [trustedContacts, setTrustedContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [sendingLocation, setSendingLocation] = useState(false)

  // Fetch trusted contacts
  const fetchContacts = async () => {
    try {
      setLoadingContacts(true)
      const result = await trustedContactService.getContacts()
      if (result.success) {
        setTrustedContacts(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoadingContacts(false)
    }
  }

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    ).start()
  }, [glowAnim])

  // Fetch contacts on mount and when screen comes into focus
  useEffect(() => {
    fetchContacts()
  }, [])

  // Auto-start location sharing when dashboard loads (for parent tracking)
  useEffect(() => {
    const startLocationSharing = async () => {
      try {
        // Check if location sharing is already active
        if (!locationSharingService.isSharing()) {
          console.log('[Dashboard] Starting automatic location sharing for parents...')
          const success = await locationSharingService.startLocationSharing()
          if (success) {
            console.log('[Dashboard] Location sharing started successfully')
          } else {
            console.warn('[Dashboard] Location sharing failed - permission may be denied')
            // Don't show alert here as it might be annoying, but log it
          }
        } else {
          console.log('[Dashboard] Location sharing already active')
        }
      } catch (error) {
        console.error('[Dashboard] Error starting location sharing:', error)
      }
    }

    // Start location sharing when component mounts
    if (user) {
      startLocationSharing()
    }

    // Cleanup: stop location sharing when component unmounts (optional)
    return () => {
      // Note: We don't stop location sharing on unmount because we want it to run continuously
      // Only stop it when user explicitly stops it or logs out
    }
  }, [user])

  useFocusEffect(
    React.useCallback(() => {
      // Check if recording is actually active
      const status = getRecordingStatus()
      setSosActive(status.isRecording)
      // Refresh contacts when screen comes into focus (e.g., after adding from TrustedContactsScreen)
      fetchContacts()
    }, [])
  )

  // Reset SOS state when screen comes into focus (user returned from SOS screen)
  useFocusEffect(
    React.useCallback(() => {
      // Check if recording is actually active
      const status = getRecordingStatus()
      setSosActive(status.isRecording)
    }, [])
  )

  // Stronger, more visible glow starting from the circle
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.25],   // starts from the circle (1.0) → expands more
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.30, 0.09],  // brighter at start, fades outward
  });

  // Secondary outer glow (bigger, softer radiating ring)
  const glowScale_2 = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.40],   // larger outer ring pulse
  });

  const glowOpacity_2 = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.20, 0.05],  // softer outer visibility
  });


  const handleSOS = async () => {
    try {
      if (sosActive) {
        // If already active, stop it (shouldn't happen from dashboard, but just in case)
        const userId = user?.id || 1
        await stopSOS(userId)
        setSosActive(false)
      } else {
        // Navigate to SOS Active screen first
        // The SOS Active screen will handle starting SOS after camera is ready
        setSosActive(true)
        navigation.navigate('SOSActive')
      }
    } catch (err) {
      console.log('SOS error', err)
      Alert.alert('SOS Error', err?.message || 'Unable to start SOS. Check permissions.')
      setSosActive(false)
    }
  }

  // Handle adding new contact
  const handleAddContact = async (contactData) => {
    try {
      // Map the contact data to match trustedContactService format
      const mappedData = {
        name: contactData.name,
        phone: contactData.phone,
        relationship: contactData.relation || contactData.relationship || 'Friend',
        priority: contactData.priority || trustedContacts.length + 1,
      }
      const result = await trustedContactService.addContact(mappedData)
      if (result.success) {
        Alert.alert('Success', 'Trusted contact added successfully.')
        await fetchContacts()
        return true
      } else {
        throw new Error(result.message || 'Failed to add contact')
      }
    } catch (error) {
      throw error
    }
  }

  // Handle tap to call
  const handleCallContact = (phone) => {
    if (!phone) {
      Alert.alert('Error', 'Phone number not available.')
      return
    }

    const phoneUrl = `tel:${phone}`
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl)
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device.')
        }
      })
      .catch((err) => {
        console.error('Error opening phone:', err)
        Alert.alert('Error', 'Failed to make phone call.')
      })
  }

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '??'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Send current location to all trusted contacts
  const handleSendLocation = async () => {
    if (trustedContacts.length === 0) {
      Alert.alert('No Contacts', 'Please add trusted contacts first.')
      return
    }

    try {
      setSendingLocation(true)

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to send your location.')
        return
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const { latitude, longitude } = location.coords

      // Reverse geocode to get address
      let addressText = ''
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        })

        if (geocode && geocode.length > 0) {
          const addr = geocode[0]
          const addressParts = []
          if (addr.street) addressParts.push(addr.street)
          if (addr.name) addressParts.push(addr.name)
          if (addr.city) addressParts.push(addr.city)
          if (addr.district) addressParts.push(addr.district)
          addressText = addressParts.join(', ') || 'Current Location'
        }
      } catch (error) {
        console.error('Geocoding error:', error)
        addressText = 'Current Location'
      }

      // Create message with location
      const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`
      const message = `📍 My Current Location\n\n${addressText}\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nView on map: ${locationUrl}`

      // Check if SMS is available
      const isAvailable = await SMS.isAvailableAsync()
      if (!isAvailable) {
        Alert.alert('SMS Not Available', 'SMS is not available on this device.')
        return
      }

      // Get all phone numbers from trusted contacts
      const phoneNumbers = trustedContacts
        .map((contact) => contact.phone)
        .filter((phone) => phone && phone.trim())

      if (phoneNumbers.length === 0) {
        Alert.alert('No Phone Numbers', 'Trusted contacts do not have valid phone numbers.')
        return
      }

      // Send SMS to all contacts
      await SMS.sendSMSAsync(phoneNumbers, message)

      Alert.alert(
        'Location Sent',
        `Your location has been sent to ${phoneNumbers.length} trusted contact${phoneNumbers.length > 1 ? 's' : ''}.`
      )
    } catch (error) {
      console.error('Send location error:', error)
      Alert.alert('Error', error.message || 'Failed to send location. Please try again.')
    } finally {
      setSendingLocation(false)
    }
  }

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.5 }}
      style={styles.container}
    >
      {/* Hidden Camera for SOS video recording */}
      <HiddenCamera />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image source={require('../../assets/icon.png')} style={styles.brandIcon} />
            <View style={styles.brandTextContainer}>
              <Text style={styles.brand}>SafetyNet</Text>
              <Text style={styles.greeting}>Welcome — You are Safe with Us. 👋</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bell}>
            <Image
              source={require('../../assets/Notification.png')}
              style={styles.bellIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* SOS Button */}
        <View style={styles.sosWrapper}>
          <Animated.View style={[styles.sosGlow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
          <Animated.View style={[styles.sosGlow, { transform: [{ scale: glowScale_2 }], opacity: glowOpacity_2 }]} />
          <TouchableOpacity onPress={handleSOS} activeOpacity={0.8}>
            <LinearGradient
              colors={['#ff6b97', '#f7396c', '#e91e7d']}
              start={{ x: 1.5, y: 0.5 }}
              end={{ x: .5, y: 1.2 }}
              style={styles.sosButton}
            >
              <Image
                source={require('../../assets/SOS_icon.png')}
                style={styles.sosIconImg}
                accessibilityLabel="SOS Icon"
              />
              <Text style={styles.sosText}>{sosActive ? 'STOP' : 'SOS'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.sosHint}>Press for emergency assistance</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Image source={require('../../assets/quickaction.png')} style={styles.sectionIcon} />
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#FFF7D9' }]}
              onPress={() => navigation.navigate('IncidentReport')}
            >
              <Image source={require('../../assets/Report_icon.png')} style={styles.quickIconImg} />
              <Text style={styles.quickLabel}>Report Incident</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: '#E6F6E6' }]}
              onPress={() => navigation.navigate('EmergencyHelplines')}
            >
              <Image source={require('../../assets/emergency_helpline_icon.png')} style={styles.quickIconImg} />
              <Text style={styles.quickLabel}>Emergency Helplines</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Trusted Contacts</Text>
              <Image source={require('../../assets/trustedContact.png')} style={styles.sectionIcon} />
            </View>
            <TouchableOpacity
              style={[styles.addBtn, trustedContacts.length >= 3 && styles.addBtnDisabled]}
              onPress={() => setModalVisible(true)}
              disabled={trustedContacts.length >= 3}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {loadingContacts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : trustedContacts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No trusted contacts yet</Text>
              <Text style={styles.emptyHint}>Tap + to add up to 3 contacts</Text>
            </View>
          ) : (
            <>
              <View style={styles.contactsRow}>
                {trustedContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactCard}
                    onPress={() => handleCallContact(contact.phone)}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactInitials}>{getInitials(contact.name)}</Text>
                      <View style={styles.statusDot} />
                    </View>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {contact.name}
                    </Text>
                    <Text style={styles.contactRelation} numberOfLines={1}>
                      {contact.relationship || contact.relation || 'Contact'}
                    </Text>
                  </TouchableOpacity>
                ))}
                {/* Fill empty slots */}
                {Array.from({ length: 3 - trustedContacts.length }).map((_, index) => (
                  <View key={`empty-${index}`} style={[styles.contactCard, styles.contactCardEmpty]}>
                    <View style={[styles.contactAvatar, styles.contactAvatarEmpty]}>
                      <Text style={styles.contactEmptyIcon}>+</Text>
                    </View>
                    <Text style={styles.contactEmptyText}>Empty</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.contactHint}>Tap to call instantly</Text>

              {/* Send Location Button */}
              <TouchableOpacity
                onPress={handleSendLocation}
                disabled={sendingLocation}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ffc2d9', '#FFE4E1', '#ffc2d9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.sendLocationButton, sendingLocation && styles.sendLocationButtonDisabled]}
                >
                  {sendingLocation ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.sendLocationText}>Send My Location</Text>
                      <Text style={styles.sendLocationIcon}>➤</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Safety Resources */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Safety Resources</Text>
              <Image source={require('../../assets/SafetyResources_icon.png')} style={styles.sectionIcon} />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Essential</Text>
            </View>
          </View>
          {resources.map((r) => {
            let iconSource = null
            if (r.title === 'Legal Rights') iconSource = require('../../assets/legalrights_icon.png')
            else if (r.title === 'Self-Defense Tips') iconSource = require('../../assets/DefenseTechnique_icon.png')
            else if (r.title === 'Warning Signs') iconSource = require('../../assets/WarningSign_icon.png')

            const handleResourcePress = () => {
              switch (r.title) {
                case 'Legal Rights':
                  navigation.navigate('LegalRights')
                  break
                case 'Self-Defense Tips':
                  navigation.navigate('SelfDefenseTips')
                  break
                case 'Warning Signs':
                  navigation.navigate('WarningSigns')
                  break
                default:
                  navigation.navigate('SafetyResources')
              }
            }

            return (
              <TouchableOpacity
                key={r.title}
                style={styles.resourceCard}
                onPress={handleResourcePress}
                activeOpacity={0.7}
              >
                <View style={styles.resourceRow}>
                  {iconSource ? <Image source={iconSource} style={styles.resourceIconImg} /> : null}
                  <View style={styles.resourceText}>
                    <Text style={styles.resourceTitle}>{r.title}</Text>
                    <Text style={styles.resourceDesc}>{r.desc}</Text>
                  </View>
                </View>
                <Text style={styles.resourceArrow}>›</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Women Safety News Section */}
        <WomenSafetyNewsCards />

      </ScrollView>
      <BottomNav />

      {/* Add Trusted Contact Modal */}
      <AddTrustedContactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddContact}
        existingCount={trustedContacts.length}
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 140, // space for fixed bottom nav
    marginTop: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,

  },
  brandIcon: { width: 51, height: 51, resizeMode: 'contain' },
  brandTextContainer: {
    justifyContent: 'center',
  },
  brand: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,

  },
  greeting: {
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  bellIcon: {
    width: 25,
    height: 25,
  },
  sosWrapper: {
    alignItems: 'center',
    marginTop: theme.spacing['2xl'],
  },
  sosGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 110,
    backgroundColor: '#FF5252',
    opacity: 0.29,
    marginTop: -10,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9C27B0',
    shadowOpacity: 0.5,
    shadowRadius: 54,
    shadowOffset: { width: 2, height: 10 },
    elevation: 24,
  },
  sosIconImg: { width: 68, height: 68, resizeMode: 'contain' },
  sosText: {
    fontSize: 24,
    color: '#fff',
    marginTop: 6,
    letterSpacing: 2,
    fontWeight: theme.fonts.weights.bold,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1,
  },
  sosHint: { marginTop: theme.spacing.md, color: theme.colors.textMuted, marginTop: 19 },
  section: { marginTop: theme.spacing['2xl'] },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: { fontSize: theme.fonts.sizes['2xl'], fontWeight: theme.fonts.weights.bold, color: theme.colors.textDark },
  sectionIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginTop: 8,
  },
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  quickIconImg: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
    marginBottom: theme.spacing.sm,

  },
  quickLabel: { fontSize: theme.fonts.sizes.base, color: theme.colors.textDark, fontWeight: theme.fonts.weights.bold },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -5,
    marginBottom: -1,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',

  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: { fontSize: 25, color: theme.colors.primary, marginTop: -4, marginLeft: 1, fontWeight: theme.fonts.weights.medium },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    fontWeight: theme.fonts.weights.bold,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  emptyHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  contactCardEmpty: {
    opacity: 0.4,
  },
  contactAvatarEmpty: {
    backgroundColor: theme.colors.backgroundMuted,
  },
  contactEmptyIcon: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  contactEmptyText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  contactsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    ...theme.shadows.sm,
  },
  contactAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#cfe9ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  contactInitials: { fontSize: 22, fontWeight: theme.fonts.weights.bold, color: theme.colors.textDark },
  statusDot: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#24d26f',
    borderWidth: 2,
    borderColor: '#fff',
  },
  favoriteDot: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffcc00',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactName: { fontWeight: theme.fonts.weights.bold, color: theme.colors.textDark },
  contactRelation: { color: theme.colors.textMuted, marginTop: 2 },
  contactHint: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  sendLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#FFB6C1',
    ...theme.shadows.sm,
  },
  sendLocationButtonDisabled: {
    opacity: 0.6,
  },
  sendLocationIcon: {
    fontSize: 22,
    color: '#ff4063',
    transform: [{ rotate: '-33deg' }],
    marginTop: -8,
  },
  sendLocationText: {
    color: theme.colors.primary,
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
  },
  badge: {
    backgroundColor: '#f2e8ff',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: theme.colors.primary, fontWeight: theme.fonts.weights.semibold },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
  resourceText: { flex: 1 },
  resourceIconImg: {
    width: 42,
    height: 42,
    resizeMode: 'contain',

  },
  resourceTitle: { fontSize: theme.fonts.sizes.lg, color: theme.colors.textDark, fontWeight: theme.fonts.weights.bold },
  resourceDesc: { fontSize: theme.fonts.sizes.base, color: theme.colors.textMuted, marginTop: 4 },
  resourceArrow: { fontSize: 22, color: theme.colors.textMuted },
})

export default DashboardScreen
