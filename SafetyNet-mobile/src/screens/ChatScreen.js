import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../context/AuthContext';
import parentLinkService from '../services/parentLinkService';
import parentChildChatService from '../services/parentChildChatService';
import { subscribeToChildChannel, unsubscribeFromChannel } from '../services/pusherService';
import { useBadgeCounts } from '../hooks/useBadgeCounts';
import theme from '../utils/theme';

const ChatScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollViewRef = useRef(null);
  const lastMessageIdRef = useRef(0);
  const pollIntervalRef = useRef(null);
  const channelRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { parentId: count }
  const [forceUpdate, setForceUpdate] = useState(0);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null); // { messageId, sound }
  const recordingDurationRef = useRef(null);

  /**
   * Fetch linked parents
   */
  const fetchParents = async () => {
    try {
      setLoading(true);
      const response = await parentLinkService.getLinkedParents();
      if (response && response.success) {
        let parentsList = [];
        if (response.data?.parents && Array.isArray(response.data.parents)) {
          parentsList = response.data.parents;
        } else if (Array.isArray(response.data)) {
          parentsList = response.data;
        }
        setParents(parentsList);
      } else {
        setParents([]);
      }
    } catch (error) {
      console.error('Error fetching parents:', error);
      Alert.alert('Error', 'Failed to load parents. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load messages for selected parent
   */
  const loadMessages = async (parentId) => {
    try {
      setLoadingMessages(true);
      const response = await parentChildChatService.getMessages(parentId);
      if (response.success && Array.isArray(response.data)) {
        const sortedMessages = response.data.sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return aTime - bTime;
        });
        setMessages(sortedMessages);
        if (sortedMessages.length > 0) {
          lastMessageIdRef.current = Math.max(...sortedMessages.map(m => m.id || 0));
        }
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
        setTimeout(() => {
          setForceUpdate(prev => prev + 1);
        }, 150);

        // Clear unread count when opening chat
        setUnreadCounts(prev => {
          const updated = { ...prev };
          delete updated[parentId];
          return updated;
        });

        // Mark messages as read and refresh badge count
        parentChildChatService.markAsRead(parentId).then(() => {
          refreshCounts(); // Refresh badge count after marking as read
        }).catch(err => {
          console.warn('Failed to mark messages as read:', err);
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  /**
   * Fetch unread counts for all parents
   */
  const fetchUnreadCounts = async () => {
    try {
      const response = await parentChildChatService.getUnreadCount();
      if (response.success && response.data) {
        const counts = {};
        if (Array.isArray(response.data)) {
          response.data.forEach(item => {
            if (item.parent_id) {
              counts[item.parent_id] = item.unread_count || 0;
            }
          });
        } else if (response.data.unread_counts) {
          Object.assign(counts, response.data.unread_counts);
        }
        setUnreadCounts(prev => ({ ...prev, ...counts }));
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  /**
   * Send text message
   */
  const handleSendMessage = async (customMessage = null) => {
    const messageToSend = customMessage || messageText.trim();
    if (!messageToSend || !selectedParent || sending) return;

    const parentId = selectedParent.parent?.id || selectedParent.parent_id || selectedParent.id;
    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      parent_id: parentId,
      child_id: user.id,
      sender_type: 'child',
      message: messageToSend,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    if (!customMessage) {
      setMessageText('');
    }
    setSending(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const response = await parentChildChatService.sendMessage(parentId, messageToSend);
      if (response.success && response.data) {
        // Replace temp message with real one
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempId);
          return [...filtered, response.data].sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return aTime - bTime;
          });
        });
        lastMessageIdRef.current = response.data.id;
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Alert.alert('Error', response.message || 'Failed to send message');
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /**
   * Handle quick text message
   */
  const handleQuickText = async (type) => {
    if (!selectedParent || sending) return;

    let message = '';

    switch (type) {
      case 'location':
        try {
          // Request location permission
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Location permission is required to send your location.');
            return;
          }

          // Get current location
          setSending(true);
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const { latitude, longitude } = location.coords;

          // Format message with coordinates in quotes
          const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          message = `my current location is- "${coordinates}"`;
        } catch (error) {
          setSending(false);
          Alert.alert('Error', 'Failed to get location. Please try again.');
          return;
        }
        break;
      case 'call':
        message = 'Please call me';
        break;
      case 'help':
        message = 'Need help';
        break;
      default:
        return;
    }

    // Send the message
    await handleSendMessage(message);
  };

  /**
   * Send media
   */
  const handleSendMedia = async (mediaType) => {
    if (!selectedParent || sending) return;

    const parentId = selectedParent.parent?.id || selectedParent.parent_id || selectedParent.id;
    let result;

    try {
      if (mediaType === 'image') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'Please grant permission to access photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else if (mediaType === 'video') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'Please grant permission to access videos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
          quality: 0.8,
        });
      } else if (mediaType === 'audio') {
        // Voice recording is handled separately via handleStartRecording
        return;
      } else {
        Alert.alert('Error', 'Invalid media type');
        return;
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setSending(true);
        const asset = result.assets[0];
        const response = await parentChildChatService.sendMedia(
          parentId,
          asset.uri,
          mediaType,
          null
        );

        if (response.success) {
          setMessages(prev => [...prev, response.data].sort((a, b) => {
            const aTime = new Date(a.created_at || 0).getTime();
            const bTime = new Date(b.created_at || 0).getTime();
            return aTime - bTime;
          }));
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 50);
        } else {
          Alert.alert('Error', response.message || 'Failed to send media');
        }
      }
    } catch (error) {
      console.error('Error sending media:', error);
      Alert.alert('Error', 'Failed to send media. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /**
   * Start voice recording
   */
  const handleStartRecording = async () => {
    if (!selectedParent || sending || isRecording) return;

    try {
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Audio recording permission is required.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingDurationRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  /**
   * Stop voice recording and send
   */
  const handleStopRecording = async () => {
    if (!recording || !selectedParent) return;

    try {
      setIsRecording(false);
      if (recordingDurationRef.current) {
        clearInterval(recordingDurationRef.current);
        recordingDurationRef.current = null;
      }

      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const duration = status.durationMillis ? status.durationMillis / 1000 : recordingDuration; // Duration in seconds

      setRecording(null);
      setRecordingDuration(0);

      if (!uri) {
        Alert.alert('Error', 'Failed to save recording');
        return;
      }

      // Send the audio file
      setSending(true);
      const parentId = selectedParent.parent?.id || selectedParent.parent_id || selectedParent.id;

      const response = await parentChildChatService.sendMedia(
        parentId,
        uri,
        'audio',
        null,
        duration // Pass duration
      );

      if (response.success) {
        setMessages(prev => [...prev, response.data].sort((a, b) => {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          return aTime - bTime;
        }));
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      } else {
        Alert.alert('Error', response.message || 'Failed to send voice message');
      }

      // Clean up
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    } finally {
      setSending(false);
    }
  };

  /**
   * Cancel voice recording
   */
  const handleCancelRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (recordingDurationRef.current) {
        clearInterval(recordingDurationRef.current);
        recordingDurationRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      // Delete the recording file
      if (uri) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (e) {
          console.log('Failed to delete recording file:', e);
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
    } catch (error) {
      console.error('Error canceling recording:', error);
    }
  };

  /**
   * Play audio message
   */
  const handlePlayAudio = async (message) => {
    if (!message.media_url) return;

    try {
      // Stop currently playing audio if any
      if (playingAudio && playingAudio.sound) {
        await playingAudio.sound.unloadAsync();
      }

      // Load and play new audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: message.media_url },
        { shouldPlay: true }
      );

      setPlayingAudio({ messageId: message.id, sound });

      // Clean up when playback finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          setPlayingAudio(null);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio message');
    }
  };

  /**
   * Stop playing audio
   */
  const handleStopAudio = async () => {
    if (playingAudio && playingAudio.sound) {
      try {
        await playingAudio.sound.unloadAsync();
        setPlayingAudio(null);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => { });
      }
      if (playingAudio && playingAudio.sound) {
        playingAudio.sound.unloadAsync().catch(() => { });
      }
      if (recordingDurationRef.current) {
        clearInterval(recordingDurationRef.current);
      }
    };
  }, []);

  /**
   * Setup real-time messaging
   */
  useEffect(() => {
    if (!selectedParent || !user?.id) return;

    const parentId = selectedParent.parent?.id || selectedParent.parent_id || selectedParent.id;

    // Subscribe to Pusher channel
    try {
      channelRef.current = subscribeToChildChannel(user.id, {
        onChatMessage: async (data) => {
          console.log('[ChatScreen] Pusher message received:', data);
          if (data.message) {
            const messageParentId = data.message.parent_id;
            const isForCurrentParent = messageParentId === parentId && data.message.sender_type === 'parent';

            // Show notification if message is from parent (even if viewing chat)
            if (data.message.sender_type === 'parent') {
              try {
                const parentName = data.message.parent?.full_name || data.message.parent?.name || 'Parent';
                const messageText = data.message.message || 'New message';
                const preview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;

                console.log('[ChatScreen] 📲 Scheduling notification for parent message:', {
                  parentName,
                  preview,
                  messageId: data.message.id,
                });

                const notificationId = await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `💬 New message from ${parentName}`,
                    body: preview,
                    data: {
                      type: 'message',
                      message_id: data.message.id,
                      parent_id: data.message.parent_id,
                      child_id: data.message.child_id,
                    },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                  },
                  trigger: null, // Show immediately
                });

                console.log('[ChatScreen] ✅ Notification scheduled with ID:', notificationId);
              } catch (error) {
                console.error('[ChatScreen] ❌ Failed to schedule notification:', error);
                console.error('[ChatScreen] Error details:', error.message, error.stack);
              }
            }

            // Update unread count if not viewing this parent's chat
            if (data.message.sender_type === 'parent' && messageParentId !== parentId) {
              setUnreadCounts(prev => ({
                ...prev,
                [messageParentId]: (prev[messageParentId] || 0) + 1,
              }));
            }

            // Add to messages if it's for the currently selected parent
            if (isForCurrentParent) {
              setMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) {
                  console.log('[Pusher] Duplicate message ignored:', data.message.id);
                  return prev;
                }

                console.log('[Pusher] ✅ Adding new message from parent:', data.message.id);

                const newMessages = [...prev, data.message];
                const sorted = newMessages.sort((a, b) => {
                  const aTime = new Date(a.created_at || 0).getTime();
                  const bTime = new Date(b.created_at || 0).getTime();
                  return aTime - bTime;
                });

                lastMessageIdRef.current = Math.max(...sorted.map(m => m.id || 0));

                // Force re-render
                setTimeout(() => {
                  setForceUpdate(prev => prev + 1);
                }, 0);

                return sorted;
              });

              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 300);

              parentChildChatService.markAsRead(parentId).then(() => {
                refreshCounts(); // Refresh badge count after marking as read
              }).catch(err => {
                console.warn('Failed to mark messages as read:', err);
              });

              // Clear unread count for this parent
              setUnreadCounts(prev => {
                const updated = { ...prev };
                delete updated[parentId];
                return updated;
              });
            }
          }
        },
      });
    } catch (error) {
      console.warn('Pusher subscription failed:', error);
    }

    // Polling fallback - check for new messages every 500ms
    const pollMessages = async () => {
      try {
        const response = await parentChildChatService.getMessages(parentId);
        if (response.success && Array.isArray(response.data)) {
          const newMessages = response.data;
          const newMaxId = newMessages.length > 0 ? Math.max(...newMessages.map(m => m.id || 0)) : 0;

          if (newMaxId > lastMessageIdRef.current) {
            setMessages(prev => {
              const prevIds = prev.map(m => m.id).sort((a, b) => a - b).join(',');
              const newIds = newMessages.map(m => m.id).sort((a, b) => a - b).join(',');

              if (prevIds !== newIds) {
                const sorted = newMessages.sort((a, b) => {
                  const aTime = new Date(a.created_at || 0).getTime();
                  const bTime = new Date(b.created_at || 0).getTime();
                  return aTime - bTime;
                });
                lastMessageIdRef.current = newMaxId;
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 50);
                return sorted;
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    pollMessages();
    pollIntervalRef.current = setInterval(pollMessages, 500);

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [selectedParent, user?.id]);

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchParents();
        fetchUnreadCounts();
      }
    }, [user?.id])
  );

  // Refresh unread counts periodically
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      fetchUnreadCounts();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  /**
   * Handle parent selection
   */
  const handleSelectParent = (parent) => {
    setSelectedParent(parent);
    const parentId = parent.parent?.id || parent.parent_id || parent.id;
    loadMessages(parentId);
    parentChildChatService.markAsRead(parentId);
  };

  /**
   * Get parent initials
   */
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Get parent name
   */
  const getParentName = (parent) => {
    return parent.parent?.name || parent.name || 'Unknown Parent';
  };

  /**
   * Format time
   */
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Format audio duration
   */
  const formatAudioDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Generate waveform bar heights (Messenger style)
   */
  const generateWaveformBars = (count, isPlaying) => {
    const bars = [];
    for (let i = 0; i < count; i++) {
      // Generate random heights between 4 and 20
      const baseHeight = 4 + Math.random() * 16;
      // Add some variation for visual appeal
      const height = isPlaying ? baseHeight + Math.sin(Date.now() / 100 + i) * 4 : baseHeight;
      bars.push(Math.max(4, Math.min(20, height)));
    }
    return bars;
  };

  /**
   * Open Google Maps with coordinates
   */
  const openGoogleMaps = (latitude, longitude) => {
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
    });

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    Linking.canOpenURL(url || googleMapsUrl).then((supported) => {
      if (supported) {
        Linking.openURL(url || googleMapsUrl).catch(() => {
          // Fallback to web Google Maps
          Linking.openURL(googleMapsUrl);
        });
      } else {
        // Fallback to web Google Maps
        Linking.openURL(googleMapsUrl);
      }
    }).catch(() => {
      // Fallback to web Google Maps
      Linking.openURL(googleMapsUrl);
    });
  };

  /**
   * Parse coordinates from location message
   */
  const parseLocationFromMessage = (messageText) => {
    // Match pattern: my current location is- "latitude, longitude"
    const match = messageText.match(/my current location is-\s*"([^"]+)"/i);
    if (match && match[1]) {
      const coords = match[1].split(',').map(c => c.trim());
      if (coords.length === 2) {
        const lat = parseFloat(coords[0]);
        const lng = parseFloat(coords[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
    }
    return null;
  };

  const renderMessage = (message) => {
    const isChild = message.sender_type === 'child';
    const isMedia = message.message_type !== 'text';
    const locationData = message.message ? parseLocationFromMessage(message.message) : null;
    const isLocationMessage = locationData !== null;

    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isChild ? styles.messageBubbleSent : styles.messageBubbleReceived,
        ]}
      >
        {isMedia ? (
          <View>
            {message.message_type === 'image' && message.media_url ? (
              <Image
                source={{ uri: message.media_url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            ) : message.message_type === 'video' && message.media_url ? (
              <View style={styles.mediaVideoContainer}>
                <Ionicons name="videocam" size={32} color={isChild ? '#fff' : theme.colors.primary} />
                <Text style={[styles.mediaText, isChild && styles.mediaTextWhite]}>Video</Text>
              </View>
            ) : message.message_type === 'audio' && message.media_url ? (
              <View style={styles.audioMessageContainer}>
                <TouchableOpacity
                  style={[styles.audioPlayButton, isChild && styles.audioPlayButtonSent]}
                  onPress={() => {
                    if (playingAudio && playingAudio.messageId === message.id) {
                      handleStopAudio();
                    } else {
                      handlePlayAudio(message);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={playingAudio && playingAudio.messageId === message.id ? "pause" : "play"}
                    size={18}
                    color={isChild ? '#fff' : theme.colors.primary}
                    style={{ marginLeft: 2 }}
                  />
                </TouchableOpacity>
                <View style={styles.audioWaveformContainer}>
                  <View style={[styles.audioWaveform, isChild && styles.audioWaveformSent]}>
                    {generateWaveformBars(20, playingAudio && playingAudio.messageId === message.id).map((height, index) => (
                      <View
                        key={index}
                        style={[
                          styles.waveformBar,
                          isChild && styles.waveformBarSent,
                          { height: height },
                        ]}
                      />
                    ))}
                  </View>
                  {message.media_duration && (
                    <Text style={[styles.audioDurationText, isChild && styles.audioDurationTextSent]}>
                      {formatAudioDuration(message.media_duration)}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
            {message.message && (
              <Text style={[styles.messageText, isChild && styles.messageTextWhite]}>
                {message.message}
              </Text>
            )}
          </View>
        ) : isLocationMessage ? (
          <TouchableOpacity
            onPress={() => openGoogleMaps(locationData.latitude, locationData.longitude)}
            activeOpacity={0.7}
          >
            <View style={styles.locationMessageContainer}>
              <Ionicons
                name="location"
                size={20}
                color={isChild ? '#fff' : theme.colors.primary}
                style={styles.locationIcon}
              />
              <Text style={[styles.messageText, isChild && styles.messageTextWhite, styles.locationMessageText]}>
                {message.message}
              </Text>
              <Text style={[styles.locationHint, isChild && styles.locationHintWhite]}>
                Tap to open in Google Maps
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, isChild && styles.messageTextWhite]}>
            {message.message}
          </Text>
        )}
        <Text style={[styles.messageTime, isChild && styles.messageTimeWhite]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    );
  };

  if (loading && parents.length === 0) {
    return (
      <LinearGradient
        colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </LinearGradient>
    );
  }

  // If no parent selected, show parents list
  if (!selectedParent) {
    return (
      <LinearGradient
        colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
          <Text style={styles.headerSubtitle}>Select a parent to start chatting</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchParents} tintColor={theme.colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {parents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No parents linked</Text>
              <Text style={styles.emptyHint}>Link a parent to start chatting</Text>
            </View>
          ) : (
            parents.map((parent) => {
              const parentId = parent.parent?.id || parent.parent_id || parent.id;
              const parentName = getParentName(parent);
              const unreadCount = unreadCounts[parentId] || 0;

              return (
                <TouchableOpacity
                  key={parentId}
                  style={styles.parentCard}
                  onPress={() => handleSelectParent(parent)}
                  activeOpacity={0.7}
                >
                  <View style={styles.parentCardContent}>
                    <View style={styles.parentAvatar}>
                      <Text style={styles.parentInitials}>{getInitials(parentName)}</Text>
                    </View>
                    <View style={styles.parentInfo}>
                      <Text style={styles.parentName}>{parentName}</Text>
                    </View>
                    <View style={styles.rightContainer}>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>
    );
  }

  // Chat view with selected parent
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        {/* Chat Header */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chatHeader}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedParent(null);
              setMessages([]);
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chatAvatar}
            >
              <Text style={styles.chatAvatarText}>
                {getInitials(getParentName(selectedParent))}
              </Text>
            </LinearGradient>
            <View>
              <Text style={styles.chatHeaderName}>{getParentName(selectedParent)}</Text>
              <Text style={styles.chatHeaderStatus}>Online</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          key={`messages-${messages.length}-${forceUpdate}-${Date.now()}`}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {loadingMessages ? (
            <View style={styles.loadingMessagesContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <Ionicons name="chatbubble-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
              <Text style={styles.emptyMessagesHint}>Start a conversation with {getParentName(selectedParent)}</Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>

        {/* Quick Text Buttons */}
        <View style={styles.quickTextContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickTextContent}
          >
            <TouchableOpacity
              style={styles.quickTextButton}
              onPress={() => handleQuickText('location')}
              disabled={sending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickTextButtonGradient}
              >
                <View style={styles.quickTextIconContainer}>
                  <Ionicons name="location" size={16} color="#ffffff" />
                </View>
                <Text style={styles.quickTextLabel}>My location</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickTextButton}
              onPress={() => handleQuickText('call')}
              disabled={sending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#22c55e', '#16a34a', '#15803d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickTextButtonGradient}
              >
                <View style={styles.quickTextIconContainer}>
                  <Ionicons name="call" size={16} color="#ffffff" />
                </View>
                <Text style={styles.quickTextLabel}>Call me</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickTextButton}
              onPress={() => handleQuickText('help')}
              disabled={sending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626', '#b91c1c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickTextButtonGradient}
              >
                <View style={styles.quickTextIconContainer}>
                  <Ionicons name="help-circle" size={16} color="#ffffff" />
                </View>
                <Text style={styles.quickTextLabel}>Need help</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.recordingActions}>
              <TouchableOpacity
                style={styles.cancelRecordingButton}
                onPress={handleCancelRecording}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
                <Text style={styles.cancelRecordingText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopRecordingButton}
                onPress={handleStopRecording}
              >
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.stopRecordingText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          {!isRecording ? (
            <>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => {
                  Alert.alert(
                    'Send Media',
                    'Choose media type',
                    [
                      { text: 'Image', onPress: () => handleSendMedia('image') },
                      { text: 'Video', onPress: () => handleSendMedia('video') },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Ionicons name="attach" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textMuted}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={5000}
                editable={!sending}
              />
              {messageText.trim() ? (
                <TouchableOpacity
                  style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                  onPress={() => handleSendMessage()}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={theme.colors.textWhite} />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={theme.colors.textWhite}
                    />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.voiceButton}
                  onPress={handleStartRecording}
                  disabled={sending}
                >
                  <Ionicons
                    name="mic"
                    size={24}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.recordingInputPlaceholder}>
              <Text style={styles.recordingInputText}>Recording in progress...</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.53)',
    marginTop: 20,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing['5xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
  },
  emptyText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyHint: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  parentCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    marginTop: 20,
  },
  parentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  parentInitials: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  parentInfo: {
    flex: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  parentName: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    ...theme.shadows.md,

  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: theme.spacing.xs,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 232, 232, 0.8)',
    marginTop: 20,

  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginTop: 20,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    ...theme.shadows.md,
  },
  chatAvatarText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  chatHeaderName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,

  },
  chatHeaderStatus: {
    fontSize: theme.fonts.sizes.xs,
    color: '#22c55e',
    fontWeight: theme.fonts.weights.medium,
  },
  messagesContainer: {
    flex: 1,

  },
  messagesContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  loadingMessagesContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['2xl'],
  },
  emptyMessagesText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyMessagesHint: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius['2xl'],
    marginBottom: theme.spacing.sm,
  },
  messageBubbleSent: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    ...theme.shadows.lg,
    elevation: 8,
    borderWidth: 0,
  },
  messageBubbleReceived: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    ...theme.shadows.lg,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  messageText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  messageTextWhite: {
    color: theme.colors.textWhite,
  },
  locationMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  locationIcon: {
    marginRight: theme.spacing.xs,
    marginTop: 2,
  },
  locationMessageText: {
    flex: 1,
  },
  locationHint: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
    width: '100%',
  },
  locationHintWhite: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageTime: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    alignSelf: 'flex-end',
  },
  messageTimeWhite: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mediaImage: {
    width: 220,
    height: 220,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  mediaVideoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  recordingContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 59, 48, 0.3)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: theme.spacing.sm,
  },
  recordingText: {
    fontSize: theme.fonts.sizes.base,
    color: '#FF3B30',
    fontWeight: theme.fonts.weights.medium,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  cancelRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  cancelRecordingText: {
    fontSize: theme.fonts.sizes.base,
    color: '#FF3B30',
    fontWeight: theme.fonts.weights.medium,
  },
  stopRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  stopRecordingText: {
    fontSize: theme.fonts.sizes.base,
    color: '#34C759',
    fontWeight: theme.fonts.weights.medium,
  },
  recordingInputPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  recordingInputText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  audioMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    maxWidth: 280,
    paddingVertical: theme.spacing.xs,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    ...theme.shadows.sm,
  },
  audioPlayButtonSent: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  audioWaveformContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  audioWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    marginBottom: 4,
    gap: 2,
  },
  audioWaveformSent: {
    opacity: 0.9,
  },
  waveformBar: {
    width: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 1.5,
    minHeight: 4,
    maxHeight: 20,
    alignSelf: 'center',
  },
  waveformBarSent: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  audioDurationText: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    fontWeight: theme.fonts.weights.medium,
    marginTop: 2,
  },
  audioDurationTextSent: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  mediaText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
  },
  mediaTextWhite: {
    color: theme.colors.textWhite,
  },
  quickTextContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  quickTextContent: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  quickTextButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...theme.shadows.md,
    elevation: 3,
    marginRight: theme.spacing.sm,
  },
  quickTextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderRadius: 12,
    minWidth: 90,
    borderWidth: 0,
  },
  quickTextIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTextLabel: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.semibold,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? theme.spacing.lg : theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    ...theme.shadows.lg,
  },
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius['2xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    maxHeight: 100,
    marginRight: theme.spacing.sm,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.backgroundLight,
    opacity: 0.6,
  },
});

export default ChatScreen;
