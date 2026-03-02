import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import theme from '../utils/theme'
import { useAuth } from '../context/AuthContext'
import reportService from '../services/reportService'
import BottomNav from '../components/BottomNav'

const HARASSMENT_TYPES = [
  { value: 'verbal', label: 'Verbal Harassment' },
  { value: 'physical', label: 'Physical Harassment' },
  { value: 'sexual', label: 'Sexual Harassment' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'online', label: 'Online Harassment' },
  { value: 'other', label: 'Other' },
]

function IncidentReportScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()

  // Form state
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [incidentType, setIncidentType] = useState('')
  const [otherType, setOtherType] = useState('')
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentTime, setIncidentTime] = useState('')
  const [description, setDescription] = useState('')
  const [harasserDetails, setHarasserDetails] = useState('')
  const [locationStreet, setLocationStreet] = useState('')
  const [city, setCity] = useState('')
  const [locationDetails, setLocationDetails] = useState('')
  const [witnesses, setWitnesses] = useState('')

  // Location state
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)

  // Evidence state
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [uploading, setUploading] = useState(false)

  // Get current date/time as default
  useEffect(() => {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].slice(0, 5)
    setIncidentDate(dateStr)
    setIncidentTime(timeStr)
  }, [])

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to include location data.')
        return
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      if (geocode && geocode.length > 0) {
        const addr = geocode[0]
        setLocationStreet(addr.street || addr.name || '')
        setCity(addr.city || addr.district || addr.subAdministrativeArea || '')
      }

      Alert.alert('Success', 'Location data added successfully.')
    } catch (error) {
      console.error('Location error:', error)
      Alert.alert('Error', 'Failed to get location. Please enter manually.')
    } finally {
      setLocationLoading(false)
    }
  }

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission is required.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        // videoQuality removed - not available in this version
      })

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `evidence-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        }))
        setEvidenceFiles([...evidenceFiles, ...newFiles])
      }
    } catch (error) {
      console.error('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image/video.')
    }
  }

  // Take photo/video with camera
  const takePhoto = async (isVideo = false) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        // videoQuality removed - not available in this version
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        const newFile = {
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || `evidence-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          mimeType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        }
        setEvidenceFiles([...evidenceFiles, newFile])
      }
    } catch (error) {
      console.error('Camera error:', error)
      Alert.alert('Error', 'Failed to take photo/video.')
    }
  }

  // Remove evidence file
  const removeEvidence = (index) => {
    const newFiles = evidenceFiles.filter((_, i) => i !== index)
    setEvidenceFiles(newFiles)
  }

  // Submit report
  const handleSubmit = async () => {
    // Validation
    if (!incidentType) {
      Alert.alert('Validation Error', 'Please select an incident type.')
      return
    }

    if (incidentType === 'other' && !otherType.trim()) {
      Alert.alert('Validation Error', 'Please specify the incident type.')
      return
    }

    if (!incidentDate || !incidentTime) {
      Alert.alert('Validation Error', 'Please provide incident date and time.')
      return
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please provide a description of the incident.')
      return
    }

    if (!locationStreet.trim() || !city.trim()) {
      Alert.alert('Validation Error', 'Please provide location information.')
      return
    }

    try {
      setUploading(true)

      // Combine date and time
      const incidentDateTime = `${incidentDate} ${incidentTime}:00`

      // Prepare report data
      const reportData = {
        user_id: isAnonymous ? null : (user?.id || null),
        incident_type: incidentType === 'other' ? otherType : incidentType,
        incident_date: incidentDateTime,
        description: description.trim(),
        victim_name: isAnonymous ? 'Anonymous' : (user?.full_name || 'Unknown'),
        victim_contact: isAnonymous ? 'N/A' : (user?.email || 'N/A'),
        location_street: locationStreet.trim(),
        city: city.trim(),
        location_details: locationDetails.trim() || null,
        perpetrator_description: harasserDetails.trim() || null,
        witnesses: witnesses.trim() || null,
        status: 'pending',
      }

      // Upload evidence files if any
      if (evidenceFiles.length > 0) {
        const uploadedFiles = await uploadEvidenceFiles(evidenceFiles)
        reportData.evidence_files = uploadedFiles
      }

      // Create report
      const result = await reportService.create(reportData)

      if (result.success) {
        Alert.alert(
          'Success',
          'Your incident report has been submitted successfully. Thank you for helping create a safer community.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        )
      } else {
        Alert.alert('Error', result.message || 'Failed to submit report. Please try again.')
      }
    } catch (error) {
      console.error('Submit error:', error)
      Alert.alert('Error', error.message || 'Failed to submit report. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Upload evidence files to backend
  const uploadEvidenceFiles = async (files) => {
    const uploadedUrls = []
    for (const file of files) {
      try {
        const formData = new FormData()
        const fileUri = Platform.OS === 'android' ? file.uri : (file.uri.startsWith('file://') ? file.uri.replace('file://', '') : file.uri)

        formData.append('file', {
          uri: fileUri,
          type: file.mimeType,
          name: file.name,
        })
        formData.append('type', file.type === 'video' ? 'video' : 'image')

        const { getToken } = await import('../services/api')
        const token = await getToken()
        const { default: api } = await import('../services/api')
        const baseURL = api.defaults.baseURL || 'http://192.168.0.100:8000/api'

        const response = await fetch(`${baseURL}/reports/upload-evidence`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            // Don't set Content-Type - let fetch set it with boundary
          },
          body: formData,
        })

        const data = await response.json()
        if (data.success && data.data?.file_path) {
          uploadedUrls.push(data.data.file_path)
        } else {
          console.error('Upload failed:', data.message)
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
    return uploadedUrls
  }

  return (
    <LinearGradient
      colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.1 }}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Report an Incident</Text>
            <Image source={require('../../assets/report.png')} style={styles.titleIcon} />
          </View>
          <Text style={styles.subtitle}>Your safety matters. Report incidents to help create a safer community.</Text>
        </View>

        {/* Anonymous Option */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsAnonymous(!isAnonymous)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
              {isAnonymous && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Report anonymously</Text>
          </TouchableOpacity>
        </View>

        {/* Incident Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Type of Harassment *</Text>
          <View style={styles.typeGrid}>
            {HARASSMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeButton, incidentType === type.value && styles.typeButtonActive]}
                onPress={() => setIncidentType(type.value)}
              >
                <Text style={[styles.typeButtonText, incidentType === type.value && styles.typeButtonTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {incidentType === 'other' && (
            <TextInput
              style={styles.input}
              placeholder="Please specify the incident type"
              value={otherType}
              onChangeText={setOtherType}
              placeholderTextColor={theme.colors.textMuted}
            />
          )}
        </View>

        {/* Date and Time */}
        <View style={styles.section}>
          <Text style={styles.label}>When did this happen? *</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={incidentDate}
                onChangeText={setIncidentDate}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={incidentTime}
                onChangeText={setIncidentTime}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please provide as many details as possible..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Location Information *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.locationButtonText}>📍 Use Current</Text>
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            value={locationStreet}
            onChangeText={setLocationStreet}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            value={city}
            onChangeText={setCity}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional location details (optional)"
            value={locationDetails}
            onChangeText={setLocationDetails}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={theme.colors.textMuted}
          />
          {currentLocation && (
            <Text style={styles.locationInfo}>
              📍 Coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* Harasser Details */}
        <View style={styles.section}>
          <Text style={styles.label}>Harasser Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the harasser (appearance, behavior, etc.)"
            value={harasserDetails}
            onChangeText={setHarasserDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Witnesses */}
        <View style={styles.section}>
          <Text style={styles.label}>Witnesses (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Information about any witnesses"
            value={witnesses}
            onChangeText={setWitnesses}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Evidence Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>Evidence (Photos/Videos)</Text>
          <View style={styles.evidenceButtons}>
            <TouchableOpacity style={styles.evidenceButton} onPress={pickImage}>
              <Text style={styles.evidenceButtonText}>📷 Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.evidenceButton} onPress={() => takePhoto(false)}>
              <Text style={styles.evidenceButtonText}>📸 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.evidenceButton} onPress={() => takePhoto(true)}>
              <Text style={styles.evidenceButtonText}>🎥 Record Video</Text>
            </TouchableOpacity>
          </View>

          {/* Evidence Preview */}
          {evidenceFiles.length > 0 && (
            <View style={styles.evidencePreview}>
              {evidenceFiles.map((file, index) => (
                <View key={index} style={styles.evidenceItem}>
                  {file.type === 'image' ? (
                    <Image source={{ uri: file.uri }} style={styles.evidenceImage} />
                  ) : (
                    <View style={styles.evidenceVideo}>
                      <Text style={styles.evidenceVideoIcon}>🎥</Text>
                      <Text style={styles.evidenceVideoText}>Video</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeEvidence}
                    onPress={() => removeEvidence(index)}
                  >
                    <Text style={styles.removeEvidenceText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#fa6e96', '#FFE4E1', '#fa6e96']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="green" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
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
    paddingBottom: 110,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fonts.sizes['3xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  titleIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginTop: 1,
  },
  subtitle: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    lineHeight: 22,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
  },
  typeButtonTextActive: {
    color: '#ffffff',
    fontWeight: theme.fonts.weights.semibold,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.base,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    ...theme.inputs.default,
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    minHeight: 100,
    paddingTop: theme.spacing.sm,
  },
  locationButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
  },
  locationButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  locationInfo: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  evidenceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.base,
  },
  evidenceButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  evidenceButtonText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
  },
  evidencePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  backButtonText: {
    fontSize: 26,
    color: theme.colors.primary,
    marginTop: -5,
  },
  evidenceItem: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  evidenceVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenceVideoIcon: {
    fontSize: 32,
  },
  evidenceVideoText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  removeEvidence: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeEvidenceText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButton: {
    paddingVertical: theme.spacing.base,
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,

  },
  submitButtonDisabled: {
    opacity: 0.8,
  },
  submitButtonText: {
    color: '#4f4f4f',
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
  },
})

export default IncidentReportScreen
