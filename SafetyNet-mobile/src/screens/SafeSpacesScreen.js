import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Image,
} from 'react-native'
import { Linking } from 'react-native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import theme from '../utils/theme'
import BottomNav from '../components/BottomNav'
import { publicReportsAPI } from '../services/api'

// Dhaka area coordinates (approximate)
const DHAKA_COORDINATES = {
  'Gulshan': { latitude: 23.7925, longitude: 90.4078 },
  'Dhanmondi': { latitude: 23.7461, longitude: 90.3742 },
  'Uttara': { latitude: 23.8759, longitude: 90.3795 },
  'Mirpur': { latitude: 23.8041, longitude: 90.3667 },
  'Mohammadpur': { latitude: 23.7625, longitude: 90.3608 },
  'Banani': { latitude: 23.7925, longitude: 90.4050 },
  'Baridhara': { latitude: 23.8000, longitude: 90.4100 },
  'Motijheel': { latitude: 23.7333, longitude: 90.4167 },
  'Farmgate': { latitude: 23.7500, longitude: 90.3833 },
  'Shahbagh': { latitude: 23.7375, longitude: 90.3944 },
  'New Market': { latitude: 23.7300, longitude: 90.3900 },
  'Elephant Road': { latitude: 23.7350, longitude: 90.3850 },
  'Badda': { latitude: 23.7800, longitude: 90.4200 },
  'Rampura': { latitude: 23.7600, longitude: 90.4100 },
  'Malibagh': { latitude: 23.7550, longitude: 90.4150 },
  'Khilgaon': { latitude: 23.7500, longitude: 90.4250 },
  'Jatrabari': { latitude: 23.7200, longitude: 90.4400 },
  'Wari': { latitude: 23.7100, longitude: 90.4100 },
  'Old Dhaka': { latitude: 23.7104, longitude: 90.4074 },
  'Lalbagh': { latitude: 23.7150, longitude: 90.4000 },
  'Hazaribagh': { latitude: 23.7400, longitude: 90.3800 },
  'Kamrangirchar': { latitude: 23.7000, longitude: 90.3800 },
  'Pallabi': { latitude: 23.8200, longitude: 90.3600 },
  'Kafrul': { latitude: 23.7700, longitude: 90.3900 },
  'Cantonment': { latitude: 23.7900, longitude: 90.4000 },
  'Banasree': { latitude: 23.7800, longitude: 90.4300 },
  'Khilkhet': { latitude: 23.8500, longitude: 90.4200 },
  'Bashundhara': { latitude: 23.8000, longitude: 90.4300 },
  'Tejgaon': { latitude: 23.7600, longitude: 90.4000 },
  'Mohakhali': { latitude: 23.7800, longitude: 90.4050 },
  'Kakrail': { latitude: 23.7300, longitude: 90.4100 },
  'Ramna': { latitude: 23.7350, longitude: 90.3950 },
  'Paltan': { latitude: 23.7300, longitude: 90.4150 },
  'Shantinagar': { latitude: 23.7400, longitude: 90.4050 },
  'Dhanmondi Lake': { latitude: 23.7461, longitude: 90.3742 },
  'TSC Area': { latitude: 23.7375, longitude: 90.3944 },
  'Science Lab': { latitude: 23.7450, longitude: 90.3800 },
  'Nilkhet': { latitude: 23.7300, longitude: 90.3900 },
  'Azimpur': { latitude: 23.7200, longitude: 90.3900 },
  'Kalabagan': { latitude: 23.7500, longitude: 90.3700 },
  'Green Road': { latitude: 23.7550, longitude: 90.3750 },
  'Panthapath': { latitude: 23.7500, longitude: 90.3850 },
  'Karwan Bazar': { latitude: 23.7400, longitude: 90.3900 },
  'Banglamotor': { latitude: 23.7450, longitude: 90.3950 },
  'Moghbazar': { latitude: 23.7500, longitude: 90.4100 },
  'Eskaton': { latitude: 23.7450, longitude: 90.4000 },
  'Bailey Road': { latitude: 23.7400, longitude: 90.4000 },
  'Segunbagicha': { latitude: 23.7350, longitude: 90.4100 },
  'Purana Paltan': { latitude: 23.7300, longitude: 90.4150 },
}

// CSV data converted to JavaScript
const INCIDENT_DATA = [
  { area: 'Gulshan', total_incidents: 245, harassment_type: 'Eve-teasing, Stalking, Verbal harassment', time_period: 'Evening (6-9 PM)', victim_age_group: '18-25', location_type: 'Shopping areas, Streets', reporting_rate: '35%' },
  { area: 'Dhanmondi', total_incidents: 232, harassment_type: 'Eve-teasing, Stalking, Physical harassment', time_period: 'Evening (5-8 PM)', victim_age_group: '16-25', location_type: 'Lake area, Restaurants, Streets', reporting_rate: '40%' },
  { area: 'Uttara', total_incidents: 156, harassment_type: 'Verbal harassment, Stalking', time_period: 'Afternoon (2-5 PM)', victim_age_group: '18-30', location_type: 'Markets, Bus stops', reporting_rate: '45%' },
  { area: 'Mirpur', total_incidents: 289, harassment_type: 'Eve-teasing, Physical harassment, Stalking', time_period: 'Evening (6-9 PM)', victim_age_group: '15-25', location_type: 'Bus stands, Markets, Streets', reporting_rate: '25%' },
  { area: 'Mohammadpur', total_incidents: 178, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-8 PM)', victim_age_group: '18-28', location_type: 'Markets, Streets', reporting_rate: '30%' },
  { area: 'Banani', total_incidents: 128, harassment_type: 'Stalking, Verbal harassment, Eve-teasing', time_period: 'Evening (6-10 PM)', victim_age_group: '20-30', location_type: 'Restaurants, Streets', reporting_rate: '38%' },
  { area: 'Baridhara', total_incidents: 104, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (7-10 PM)', victim_age_group: '22-35', location_type: 'Streets, Parks', reporting_rate: '42%' },
  { area: 'Motijheel', total_incidents: 267, harassment_type: 'Eve-teasing, Physical harassment', time_period: 'Office hours (9 AM-6 PM)', victim_age_group: '20-35', location_type: 'Bus stops, Streets', reporting_rate: '28%' },
  { area: 'Farmgate', total_incidents: 312, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'Peak hours (8-10 AM, 5-8 PM)', victim_age_group: '18-30', location_type: 'Bus stops, Footbridge', reporting_rate: '22%' },
  { area: 'Shahbagh', total_incidents: 298, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'All day', victim_age_group: '16-25', location_type: 'University area, Bus stops', reporting_rate: '32%' },
  { area: 'New Market', total_incidents: 324, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'Afternoon (2-6 PM)', victim_age_group: '15-30', location_type: 'Market area, Streets', reporting_rate: '20%' },
  { area: 'Elephant Road', total_incidents: 276, harassment_type: 'Eve-teasing, Physical harassment', time_period: 'Evening (4-8 PM)', victim_age_group: '16-28', location_type: 'Shopping areas, Streets', reporting_rate: '25%' },
  { area: 'Badda', total_incidents: 234, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-9 PM)', victim_age_group: '18-30', location_type: 'Bus stops, Markets', reporting_rate: '30%' },
  { area: 'Rampura', total_incidents: 167, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (6-9 PM)', victim_age_group: '20-30', location_type: 'Streets, Markets', reporting_rate: '35%' },
  { area: 'Malibagh', total_incidents: 245, harassment_type: 'Eve-teasing, Physical harassment', time_period: 'Evening (5-8 PM)', victim_age_group: '16-25', location_type: 'Markets, Streets', reporting_rate: '28%' },
  { area: 'Khilgaon', total_incidents: 189, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-8 PM)', victim_age_group: '18-28', location_type: 'Markets, Streets', reporting_rate: '32%' },
  { area: 'Jatrabari', total_incidents: 278, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'All day', victim_age_group: '16-30', location_type: 'Bus terminal, Markets', reporting_rate: '24%' },
  { area: 'Wari', total_incidents: 145, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (6-9 PM)', victim_age_group: '18-30', location_type: 'Streets, Parks', reporting_rate: '38%' },
  { area: 'Old Dhaka', total_incidents: 156, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'Evening (5-8 PM)', victim_age_group: '15-25', location_type: 'Narrow streets, Markets', reporting_rate: '30%' },
  { area: 'Lalbagh', total_incidents: 134, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (6-9 PM)', victim_age_group: '16-28', location_type: 'Streets, Historical sites', reporting_rate: '35%' },
  { area: 'Hazaribagh', total_incidents: 167, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'Afternoon (3-6 PM)', victim_age_group: '16-25', location_type: 'Streets, Markets', reporting_rate: '28%' },
  { area: 'Kamrangirchar', total_incidents: 145, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-8 PM)', victim_age_group: '15-25', location_type: 'Ferry ghat, Streets', reporting_rate: '25%' },
  { area: 'Pallabi', total_incidents: 178, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (6-9 PM)', victim_age_group: '18-28', location_type: 'Bus stops, Markets', reporting_rate: '32%' },
  { area: 'Kafrul', total_incidents: 156, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (5-8 PM)', victim_age_group: '20-30', location_type: 'Streets, Markets', reporting_rate: '35%' },
  { area: 'Cantonment', total_incidents: 89, harassment_type: 'Verbal harassment', time_period: 'Evening (7-10 PM)', victim_age_group: '22-35', location_type: 'Streets', reporting_rate: '55%' },
  { area: 'Banasree', total_incidents: 189, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'Evening (5-9 PM)', victim_age_group: '18-28', location_type: 'Markets, Streets', reporting_rate: '33%' },
  { area: 'Khilkhet', total_incidents: 167, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (6-9 PM)', victim_age_group: '16-25', location_type: 'Bus stops, Markets', reporting_rate: '30%' },
  { area: 'Bashundhara', total_incidents: 178, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (6-10 PM)', victim_age_group: '20-30', location_type: 'Streets, Shopping areas', reporting_rate: '35%' },
  { area: 'Tejgaon', total_incidents: 256, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'Office hours (9 AM-6 PM)', victim_age_group: '20-35', location_type: 'Industrial area, Streets', reporting_rate: '26%' },
  { area: 'Mohakhali', total_incidents: 267, harassment_type: 'Eve-teasing, Physical harassment', time_period: 'All day', victim_age_group: '18-30', location_type: 'Bus terminal, Streets', reporting_rate: '28%' },
  { area: 'Kakrail', total_incidents: 145, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-8 PM)', victim_age_group: '20-30', location_type: 'Streets, Restaurants', reporting_rate: '40%' },
  { area: 'Ramna', total_incidents: 134, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (6-9 PM)', victim_age_group: '18-28', location_type: 'Park area, Streets', reporting_rate: '42%' },
  { area: 'Paltan', total_incidents: 156, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Office hours (9 AM-6 PM)', victim_age_group: '22-35', location_type: 'Office areas, Streets', reporting_rate: '38%' },
  { area: 'Shantinagar', total_incidents: 167, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'Evening (5-8 PM)', victim_age_group: '18-28', location_type: 'Streets, Markets', reporting_rate: '35%' },
  { area: 'Dhanmondi Lake', total_incidents: 234, harassment_type: 'Eve-teasing, Stalking', time_period: 'Evening (5-8 PM)', victim_age_group: '16-25', location_type: 'Lake walkway', reporting_rate: '30%' },
  { area: 'TSC Area', total_incidents: 289, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'All day', victim_age_group: '18-25', location_type: 'University campus', reporting_rate: '28%' },
  { area: 'Science Lab', total_incidents: 245, harassment_type: 'Eve-teasing, Physical harassment', time_period: 'Afternoon (2-6 PM)', victim_age_group: '16-22', location_type: 'Bus stops, Streets', reporting_rate: '25%' },
  { area: 'Nilkhet', total_incidents: 267, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'All day', victim_age_group: '16-25', location_type: 'Book markets, Streets', reporting_rate: '22%' },
  { area: 'Azimpur', total_incidents: 178, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-8 PM)', victim_age_group: '16-28', location_type: 'Markets, Streets', reporting_rate: '30%' },
  { area: 'Kalabagan', total_incidents: 189, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'Evening (6-9 PM)', victim_age_group: '18-28', location_type: 'Streets, Bus stops', reporting_rate: '32%' },
  { area: 'Green Road', total_incidents: 167, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (5-8 PM)', victim_age_group: '20-30', location_type: 'Shopping areas, Streets', reporting_rate: '35%' },
  { area: 'Panthapath', total_incidents: 156, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (6-9 PM)', victim_age_group: '22-32', location_type: 'Streets, Restaurants', reporting_rate: '38%' },
  { area: 'Karwan Bazar', total_incidents: 128, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'All day', victim_age_group: '18-35', location_type: 'Market area, Bus stops', reporting_rate: '20%' },
  { area: 'Banglamotor', total_incidents: 278, harassment_type: 'Eve-teasing, Physical harassment', time_period: 'Peak hours (8-10 AM, 5-8 PM)', victim_age_group: '18-30', location_type: 'Bus stops, Streets', reporting_rate: '24%' },
  { area: 'Moghbazar', total_incidents: 256, harassment_type: 'Physical harassment, Eve-teasing', time_period: 'Evening (5-9 PM)', victim_age_group: '16-28', location_type: 'Intersection, Markets', reporting_rate: '26%' },
  { area: 'Eskaton', total_incidents: 145, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Evening (6-9 PM)', victim_age_group: '20-30', location_type: 'Streets, Parks', reporting_rate: '40%' },
  { area: 'Bailey Road', total_incidents: 156, harassment_type: 'Verbal harassment, Stalking', time_period: 'Evening (5-8 PM)', victim_age_group: '18-28', location_type: 'Streets, Restaurants', reporting_rate: '38%' },
  { area: 'Segunbagicha', total_incidents: 134, harassment_type: 'Verbal harassment, Eve-teasing', time_period: 'Office hours (9 AM-6 PM)', victim_age_group: '22-35', location_type: 'Office areas, Streets', reporting_rate: '42%' },
  { area: 'Purana Paltan', total_incidents: 167, harassment_type: 'Eve-teasing, Verbal harassment', time_period: 'Office hours (9 AM-6 PM)', victim_age_group: '20-32', location_type: 'Office areas, Streets', reporting_rate: '35%' },
]

// Incident types (matching database enum)
const INCIDENT_TYPES = ['harassment', 'theft', 'assault', 'stalking', 'other']

// Get safety level based on incident count
const getSafetyLevel = (incidents) => {
  if (incidents >= 250) return 'high'
  if (incidents >= 150) return 'medium'
  return 'low'
}

// Get color for safety level
const getSafetyColor = (level) => {
  switch (level) {
    case 'high': return 'rgba(255, 0, 0, 0.5)' // Red
    case 'medium': return 'rgba(255, 255, 0, 0.5)' // Yellow
    case 'low': return 'rgba(0, 255, 0, 0.5)' // Green
    default: return 'rgba(128, 128, 128, 0.5)' // Gray
  }
}

// Generate HTML for Leaflet.js map with OpenStreetMap
const generateMapHTML = (data, blinkOpacity) => {
  const circles = data.map((item, index) => {
    const coords = DHAKA_COORDINATES[item.area]
    if (!coords) return ''

    const safetyLevel = getSafetyLevel(item.total_incidents)
    const radius = Math.max(300, item.total_incidents * 2)

    let fillColor, strokeColor, opacity
    if (safetyLevel === 'high') {
      fillColor = '#FF0000'
      strokeColor = '#FF0000'
      opacity = blinkOpacity * 0.5
    } else if (safetyLevel === 'medium') {
      fillColor = '#FFFF00'
      strokeColor = '#FFFF00'
      opacity = 0.5
    } else {
      fillColor = '#00FF00'
      strokeColor = '#00FF00'
      opacity = 0.5
    }

    return `
      L.circle([${coords.latitude}, ${coords.longitude}], {
        color: '${strokeColor}',
        fillColor: '${fillColor}',
        fillOpacity: ${opacity},
        radius: ${radius},
        weight: 2
      }).addTo(map).bindPopup('<b>${item.area}</b><br>${item.total_incidents} incidents<br><strong>${safetyLevel.toUpperCase()} risk</strong>');
      
      L.marker([${coords.latitude}, ${coords.longitude}]).addTo(map)
        .bindPopup('<b>${item.area}</b><br>${item.total_incidents} incidents<br>${safetyLevel.toUpperCase()} risk');
    `
  }).join('\n')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: true }).setView([23.8103, 90.4125], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
          subdomains: ['a', 'b', 'c']
        }).addTo(map);
        
        ${circles}
      </script>
    </body>
    </html>
  `
}

function SafeSpacesScreen() {
  const [timeFilter, setTimeFilter] = useState('all') // '7days', '30days', 'all'
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportData, setReportData] = useState({
    reporter_name: '',
    contact_info: '',
    area_name: '',
    latitude: null,
    longitude: null,
    incident_type: '',
    incident_description: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    is_anonymous: false,
    photo: null,
    audio: null,
  })
  const [loading, setLoading] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState(null)
  const [locationPermission, setLocationPermission] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [blinkOpacity, setBlinkOpacity] = useState(1)
  const mapRef = useRef(null)
  const blinkAnimation = useRef(new Animated.Value(1)).current

  // Dhaka center coordinates
  const DHAKA_CENTER = {
    latitude: 23.8103,
    longitude: 90.4125,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  }

  useEffect(() => {
    requestLocationPermission()
    loadUserLocation()

    // Timeout to hide loading after 10 seconds
    const timeout = setTimeout(() => {
      if (mapLoading) {
        console.warn('Map loading timeout')
        setMapLoading(false)
        setMapError('Map is taking longer than expected to load. Please check your internet connection.')
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [])

  // Blinking animation for high-risk areas
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnimation, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: false, // Must be false for non-transform properties
        }),
        Animated.timing(blinkAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    )
    blink.start()

    // Update state with animated value
    const listener = blinkAnimation.addListener(({ value }) => {
      setBlinkOpacity(value)
    })

    return () => {
      blink.stop()
      blinkAnimation.removeListener(listener)
    }
  }, [])

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(status === 'granted')
    } catch (error) {
      console.error('Error requesting location permission:', error)
    }
  }

  const loadUserLocation = async () => {
    try {
      if (locationPermission) {
        const location = await Location.getCurrentPositionAsync({})
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
      }
    } catch (error) {
      console.error('Error getting location:', error)
    }
  }

  const getFilteredData = () => {
    // For now, return all data. In production, filter by date based on timeFilter
    return INCIDENT_DATA
  }

  const handleUseGPSLocation = async () => {
    try {
      if (!locationPermission) {
        Alert.alert('Permission Required', 'Please enable location permissions in settings')
        return
      }
      setLoading(true)
      const location = await Location.getCurrentPositionAsync({})
      setReportData({
        ...reportData,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
      // Reverse geocode to get area name
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })
      if (geocode.length > 0) {
        setReportData({
          ...reportData,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          area_name: geocode[0].district || geocode[0].subregion || 'Unknown',
        })
      }
      setLoading(false)
      Alert.alert('Success', 'Location set from GPS')
    } catch (error) {
      setLoading(false)
      Alert.alert('Error', 'Failed to get GPS location')
    }
  }

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })
      if (!result.canceled) {
        setReportData({ ...reportData, photo: result.assets[0].uri })
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const handleRecordAudio = async () => {
    try {
      // Audio recording requires expo-av package
      // For now, show a message that audio recording will be available soon
      Alert.alert(
        'Audio Recording',
        'Audio recording feature is coming soon. For now, please describe the incident in detail in the description field.',
        [{ text: 'OK' }]
      )
      // TODO: Implement audio recording when expo-av is installed
      // const { Audio } = require('expo-av')
      // const { status } = await Audio.requestPermissionsAsync()
      // if (status !== 'granted') {
      //   Alert.alert('Permission Required', 'Please enable microphone permissions')
      //   return
      // }
      // const recording = new Audio.Recording()
      // await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      // await recording.startAsync()
      // Alert.alert('Recording', 'Press OK to stop recording', [
      //   {
      //     text: 'Stop',
      //     onPress: async () => {
      //       await recording.stopAndUnloadAsync()
      //       const uri = recording.getURI()
      //       setReportData({ ...reportData, audio: uri })
      //     },
      //   },
      // ])
    } catch (error) {
      Alert.alert('Error', 'Failed to record audio')
    }
  }

  const handleSubmitReport = async () => {
    if (!reportData.incident_type || !reportData.incident_description) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    if (!reportData.latitude || !reportData.longitude) {
      Alert.alert('Error', 'Please set location (GPS or manual)')
      return
    }

    try {
      setLoading(true)

      // Prepare JSON data (backend API expects JSON, not FormData)
      const reportPayload = {
        reporter_name: reportData.is_anonymous ? 'Anonymous' : reportData.reporter_name || 'Anonymous',
        contact_info: reportData.is_anonymous ? 'N/A' : reportData.contact_info || 'N/A',
        area_name: reportData.area_name || 'Unknown',
        latitude: parseFloat(reportData.latitude),
        longitude: parseFloat(reportData.longitude),
        incident_type: reportData.incident_type,
        incident_description: reportData.incident_description,
        incident_date: reportData.incident_date,
        incident_time: reportData.incident_time ? reportData.incident_time + ':00' : null,
        risk_level: 'medium',
      }

      const response = await publicReportsAPI.create(reportPayload)

      if (response.success) {
        Alert.alert('Success', 'Incident reported successfully')
        setShowReportModal(false)
        setReportData({
          reporter_name: '',
          contact_info: '',
          area_name: '',
          latitude: null,
          longitude: null,
          incident_type: '',
          incident_description: '',
          incident_date: new Date().toISOString().split('T')[0],
          incident_time: new Date().toTimeString().slice(0, 5),
          is_anonymous: false,
          photo: null,
          audio: null,
        })
      } else {
        Alert.alert('Error', response.message || 'Failed to submit report')
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      Alert.alert('Error', error.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = getFilteredData()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>SafetyNet</Text>
        <Text style={styles.tagline}>Safe Zones Map</Text>
      </View>

      {/* Time Filter Toggles */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === '7days' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('7days')}
        >
          <Text style={[styles.filterText, timeFilter === '7days' && styles.filterTextActive]}>
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === '30days' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('30days')}
        >
          <Text style={[styles.filterText, timeFilter === '30days' && styles.filterTextActive]}>
            30 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setTimeFilter('all')}
        >
          <Text style={[styles.filterText, timeFilter === 'all' && styles.filterTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map - Real street map visual (OSM tiles) + fallback message */}
      <View style={styles.mapContainer}>
        <View style={styles.mapFallback}>
          {/* Real street map image - Dhaka area (OpenStreetMap tile) */}
          <View style={styles.staticMapContainer}>
            <Image
              source={{ uri: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/12/3077/1769.png' }}
              style={styles.staticMapImage}
              resizeMode="cover"
            />
            <View style={styles.staticMapOverlay}>
              <Text style={styles.staticMapLabel}>Dhaka · Streets</Text>
            </View>
          </View>
          <Text style={styles.mapFallbackTitle}>🗺️ Safe Zones Map</Text>
          <Text style={styles.mapFallbackText}>
            For full map functionality, please create a development build:
          </Text>
          <Text style={styles.mapFallbackCode}>
            npx expo prebuild{'\n'}
            npx expo run:android
          </Text>

          <TouchableOpacity
            style={styles.openMapButton}
            onPress={() => {
              // Open OpenStreetMap in browser with Dhaka view
              const url = `https://www.openstreetmap.org/?mlat=23.8103&mlon=90.4125&zoom=12`
              Linking.openURL(url).catch(err => {
                Alert.alert('Error', 'Could not open map in browser')
              })
            }}
          >
            <Text style={styles.openMapButtonText}>Open Map in Browser</Text>
          </TouchableOpacity>

          {/* Safety Zones List */}
          <ScrollView style={styles.zonesList} showsVerticalScrollIndicator={false}>
            <Text style={styles.zonesListTitle}>Safety Zones Overview</Text>
            {filteredData.map((item, index) => {
              const coords = DHAKA_COORDINATES[item.area]
              if (!coords) return null

              const safetyLevel = getSafetyLevel(item.total_incidents)
              const safetyColor = safetyLevel === 'high'
                ? '#FF0000'
                : safetyLevel === 'medium'
                  ? '#FFFF00'
                  : '#00FF00'

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.zoneItem}
                  onPress={() => {
                    const url = `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}&zoom=15`
                    Linking.openURL(url).catch(err => {
                      Alert.alert('Error', 'Could not open map')
                    })
                  }}
                >
                  <View style={[styles.zoneIndicator, { backgroundColor: safetyColor }]} />
                  <View style={styles.zoneContent}>
                    <Text style={styles.zoneName}>{item.area}</Text>
                    <Text style={styles.zoneDetails}>
                      {item.total_incidents} incidents • {safetyLevel.toUpperCase()} risk
                    </Text>
                  </View>
                  <Text style={styles.zoneArrow}>→</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
        {mapLoading && !mapError && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.mapLoadingText}>Loading map...</Text>
            <Text style={styles.mapLoadingSubtext}>This may take a few moments</Text>
          </View>
        )}
        {mapError && (
          <View style={styles.mapErrorOverlay}>
            <Text style={styles.mapErrorText}>⚠️ {mapError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setMapError(null)
                setMapLoading(true)
                if (mapRef.current) {
                  mapRef.current.animateToRegion(DHAKA_CENTER, 1000)
                }
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 0, 0, 0.5)' }]} />
          <Text style={styles.legendText}>High Risk (Blinking)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 255, 0, 0.5)' }]} />
          <Text style={styles.legendText}>Medium Risk</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(0, 255, 0, 0.5)' }]} />
          <Text style={styles.legendText}>Low Risk</Text>
        </View>
      </View>

      {/* Floating Report Button */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setShowReportModal(true)}
      >
        <Text style={styles.reportButtonText}>Report Incident</Text>
      </TouchableOpacity>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Report Incident</Text>

              {/* Anonymous Toggle */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setReportData({ ...reportData, is_anonymous: !reportData.is_anonymous })}
                >
                  <View style={[styles.checkboxBox, reportData.is_anonymous && styles.checkboxBoxChecked]}>
                    {reportData.is_anonymous && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Report anonymously</Text>
                </TouchableOpacity>
              </View>

              {/* Reporter Info (if not anonymous) */}
              {!reportData.is_anonymous && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Your Name"
                    value={reportData.reporter_name}
                    onChangeText={(text) => setReportData({ ...reportData, reporter_name: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Contact Info (Email/Phone)"
                    value={reportData.contact_info}
                    onChangeText={(text) => setReportData({ ...reportData, contact_info: text })}
                    keyboardType="email-address"
                  />
                </>
              )}

              {/* Location */}
              <Text style={styles.label}>Location *</Text>
              <View style={styles.locationButtons}>
                <TouchableOpacity style={styles.locationButton} onPress={handleUseGPSLocation}>
                  <Text style={styles.locationButtonText}>Use GPS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.locationButton}
                  onPress={() => {
                    Alert.prompt(
                      'Manual Location',
                      'Enter area name:',
                      (text) => {
                        const coords = DHAKA_COORDINATES[text] || DHAKA_COORDINATES['Gulshan']
                        setReportData({
                          ...reportData,
                          area_name: text,
                          latitude: coords.latitude,
                          longitude: coords.longitude,
                        })
                      }
                    )
                  }}
                >
                  <Text style={styles.locationButtonText}>Manual</Text>
                </TouchableOpacity>
              </View>
              {reportData.area_name && (
                <Text style={styles.locationText}>Area: {reportData.area_name}</Text>
              )}

              {/* Incident Type */}
              <Text style={styles.label}>Incident Type *</Text>
              <View style={styles.incidentTypeContainer}>
                {INCIDENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.incidentTypeButton,
                      reportData.incident_type === type && styles.incidentTypeButtonActive,
                    ]}
                    onPress={() => setReportData({ ...reportData, incident_type: type })}
                  >
                    <Text
                      style={[
                        styles.incidentTypeText,
                        reportData.incident_type === type && styles.incidentTypeTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date and Time */}
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={reportData.incident_date}
                onChangeText={(text) => setReportData({ ...reportData, incident_date: text })}
              />

              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={reportData.incident_time}
                onChangeText={(text) => setReportData({ ...reportData, incident_time: text })}
              />

              {/* Description */}
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what happened..."
                value={reportData.incident_description}
                onChangeText={(text) => setReportData({ ...reportData, incident_description: text })}
                multiline
                numberOfLines={4}
              />

              {/* Photo Upload */}
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
                <Text style={styles.uploadButtonText}>
                  {reportData.photo ? 'Photo Selected ✓' : 'Upload Photo (Optional)'}
                </Text>
              </TouchableOpacity>

              {/* Audio Upload */}
              <TouchableOpacity style={styles.uploadButton} onPress={handleRecordAudio}>
                <Text style={styles.uploadButtonText}>
                  {reportData.audio ? 'Audio Recorded ✓' : 'Record Audio (Optional)'}
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmitReport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: theme.spacing.xl,
  },
  logoText: {
    fontSize: theme.fonts.sizes['3xl'],
    fontFamily: theme.fonts.heading,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  tagline: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textWhite,
    marginTop: theme.spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
  },
  filterTextActive: {
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.bold,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    minHeight: 400,
  },
  map: {
    flex: 1,
    width: '100%',
    minHeight: 400,
  },
  mapFallback: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.xl,
  },
  staticMapContainer: {
    height: 180,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    backgroundColor: '#e8eef2',
    ...theme.shadows.sm,
  },
  staticMapImage: {
    width: '100%',
    height: '100%',
  },
  staticMapOverlay: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  staticMapLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  mapFallbackTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  mapFallbackText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  mapFallbackCode: {
    fontSize: theme.fonts.sizes.sm,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  openMapButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  openMapButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  zonesList: {
    flex: 1,
  },
  zonesListTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.md,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundCard,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  zoneIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.md,
  },
  zoneContent: {
    flex: 1,
  },
  zoneName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  zoneDetails: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  zoneArrow: {
    fontSize: theme.fonts.sizes.lg,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.sm,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
    padding: theme.spacing.xl,
  },
  mapPlaceholderText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  mapPlaceholderSubtext: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...theme.shadows.md,
  },
  markerText: {
    color: '#fff',
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.bold,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.semibold,
  },
  mapLoadingSubtext: {
    marginTop: theme.spacing.xs,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  mapErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  mapErrorText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  legend: {
    position: 'absolute',
    top: 150,
    right: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: theme.spacing.sm,
  },
  legendText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textDark,
  },
  reportButton: {
    position: 'absolute',
    bottom: 100,
    right: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.lg,
  },
  reportButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
    padding: theme.spacing.xl,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  checkboxContainer: {
    marginBottom: theme.spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.textWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
  },
  label: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  input: {
    ...theme.inputs.default,
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  locationButton: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  locationButtonText: {
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.semibold,
  },
  locationText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  incidentTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  incidentTypeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  incidentTypeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  incidentTypeText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
  },
  incidentTypeTextActive: {
    color: theme.colors.textWhite,
    fontWeight: theme.fonts.weights.bold,
  },
  uploadButton: {
    backgroundColor: theme.colors.backgroundLight,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  uploadButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.semibold,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textMuted,
    fontSize: theme.fonts.sizes.base,
  },
})

export default SafeSpacesScreen
