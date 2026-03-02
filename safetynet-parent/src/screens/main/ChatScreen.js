import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../context/AuthContext';
import { childrenService, chatService, pusherService } from '../../services';
import { subscribeToParentChannel, unsubscribeFromChannel } from '../../services/pusherService';
import { useBadgeCounts } from '../../hooks/useBadgeCounts';
import theme from '../../utils/theme';

const ChatScreen = () => {
  const navigation = useNavigation();
  const { parent } = useAuth();
  const { refreshCounts } = useBadgeCounts();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollViewRef = useRef(null);
  const lastMessageIdRef = useRef(0);
  const pollIntervalRef = useRef(null);
  const channelRef = useRef(null);
  const forceUpdateRef = useRef(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null); // { messageId, sound }
  const recordingDurationRef = useRef(null);

  /**
   * Fetch children list
   */
  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await childrenService.getChildren();
      if (response && response.success) {
        let childrenList = [];
        if (response.data?.children && Array.isArray(response.data.children)) {
          childrenList = response.data.children;
        } else if (Array.isArray(response.data)) {
          childrenList = response.data;
        }
        setChildren(childrenList);
      } else {
        setChildren([]);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      Alert.alert('Error', 'Failed to load children. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Load messages for selected child
   */
  const loadMessages = async (childId) => {
    try {
      setLoadingMessages(true);
      const response = await chatService.getMessages(childId);
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
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  /**
   * Send text message
   */
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChild || sending) return;

    const childId = selectedChild.child?.id || selectedChild.child_id || selectedChild.id;
    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      parent_id: parent.id,
      child_id: childId,
      sender_type: 'parent',
      message: messageText.trim(),
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setMessages(prev => [...prev, tempMessage]);
    setMessageText('');
    setSending(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const response = await chatService.sendMessage(childId, messageText.trim());
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
   * Send media
   */
  const handleSendMedia = async (mediaType) => {
    if (!selectedChild || sending) return;

    const childId = selectedChild.child?.id || selectedChild.child_id || selectedChild.id;
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
        const response = await chatService.sendMedia(
          childId,
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
    if (!selectedChild || sending || isRecording) return;

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
    if (!recording || !selectedChild) return;

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
      const childId = selectedChild.child?.id || selectedChild.child_id || selectedChild.id;

      const response = await chatService.sendMedia(
        childId,
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
    if (!selectedChild || !parent?.id) return;

    const childId = selectedChild.child?.id || selectedChild.child_id || selectedChild.id;

    // Subscribe to Pusher channel
    try {
      channelRef.current = subscribeToParentChannel(parent.id, {
        onChatMessage: async (data) => {
          console.log('[ChatScreen] Pusher message received:', {
            data: data,
            hasMessage: !!data.message,
            messageId: data.message?.id,
            senderType: data.message?.sender_type,
            childId: data.message?.child_id,
            expectedChildId: childId,
            matches: data.message?.child_id === childId && data.message?.sender_type === 'child',
          });

          // Show notification if message is from child
          if (data.message && data.message.sender_type === 'child') {
            try {
              const childName = data.message.child?.full_name || data.message.child?.name || 'Child';
              const messageText = data.message.message || 'New message';
              const preview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;

              console.log('[ChatScreen] 📲 Scheduling notification for child message:', {
                childName,
                preview,
                messageId: data.message.id,
              });

              const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: `💬 New message from ${childName}`,
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

          if (data.message && data.message.child_id === childId && data.message.sender_type === 'child') {
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === data.message.id)) {
                console.log('[Pusher] Duplicate message ignored:', data.message.id);
                return prev;
              }

              console.log('[Pusher] ✅ Adding new message from child:', data.message.id);

              // Merge with existing messages
              const updated = [...prev, data.message].sort((a, b) => {
                const aIsTemp = !a.id || a.id >= 1000000000000;
                const bIsTemp = !b.id || b.id >= 1000000000000;
                if (aIsTemp && !bIsTemp) return 1;
                if (!aIsTemp && bIsTemp) return -1;
                if (a.id && b.id && a.id < 1000000000000 && b.id < 1000000000000) {
                  return a.id - b.id;
                }
                const aTime = new Date(a.created_at || 0).getTime();
                const bTime = new Date(b.created_at || 0).getTime();
                return aTime - bTime;
              });

              const realMessages = updated.filter(m => m.id && m.id < 1000000000000);
              if (realMessages.length > 0) {
                lastMessageIdRef.current = Math.max(...realMessages.map(m => m.id || 0));
              }

              // Force re-render
              setTimeout(() => {
                setForceUpdate(prev => prev + 1);
              }, 0);

              return updated;
            });

            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 50);
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 200);

            // Don't mark as read automatically when message arrives via Pusher
            // Messages should only be marked as read when user opens/views the chat
            // This ensures badge count stays accurate
          }
        },
      });
    } catch (error) {
      console.warn('Pusher subscription failed:', error);
    }

    // Polling fallback - check for new messages every 300ms (faster for instant updates)
    const pollMessages = async () => {
      try {
        const response = await chatService.getMessages(childId);
        if (response.success && Array.isArray(response.data)) {
          const newMessages = response.data;

          setMessages(prev => {
            // Filter out temporary messages (timestamp IDs >= 1000000000000) for comparison
            const realPrevMessages = prev.filter(m => m.id && m.id < 1000000000000);
            const prevMaxId = realPrevMessages.length > 0 ? Math.max(...realPrevMessages.map(m => m.id || 0)) : 0;
            const newMaxId = newMessages.length > 0 ? Math.max(...newMessages.map(m => m.id || 0)) : 0;

            // Compare sorted ID arrays for more robust detection
            const prevIds = realPrevMessages.map(m => m.id).sort((a, b) => a - b).join(',');
            const newIds = newMessages.map(m => m.id).sort((a, b) => a - b).join(',');

            const hasNewMessages = newMaxId > prevMaxId;
            const countChanged = realPrevMessages.length !== newMessages.length;
            const idsChanged = prevIds !== newIds;
            const shouldUpdate = hasNewMessages || countChanged || idsChanged;

            if (shouldUpdate) {
              console.log('[Polling] ✅ New messages detected!', {
                prevCount: prev.length,
                realPrevCount: realPrevMessages.length,
                newCount: newMessages.length,
                prevMaxId,
                newMaxId,
                hasNewMessages,
                countChanged,
                idsChanged,
              });

              // Keep temporary messages (optimistic updates)
              const tempMessages = prev.filter(m => !m.id || m.id >= 1000000000000);
              // Merge with new messages from server
              const merged = [...tempMessages, ...newMessages];
              // Sort by time
              const sorted = merged.sort((a, b) => {
                const aIsTemp = !a.id || a.id >= 1000000000000;
                const bIsTemp = !b.id || b.id >= 1000000000000;
                if (aIsTemp && !bIsTemp) return 1;
                if (!aIsTemp && bIsTemp) return -1;
                if (a.id && b.id && a.id < 1000000000000 && b.id < 1000000000000) {
                  return a.id - b.id;
                }
                const aTime = new Date(a.created_at || 0).getTime();
                const bTime = new Date(b.created_at || 0).getTime();
                return aTime - bTime;
              });

              if (newMessages.length > 0) {
                lastMessageIdRef.current = newMaxId;
              }

              console.log('[Polling] 🔄 Updating messages state!', {
                beforeCount: prev.length,
                afterCount: sorted.length,
                tempCount: tempMessages.length,
                newCount: newMessages.length,
              });

              // Force scroll to bottom
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 50);
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 200);

              // Force re-render
              setTimeout(() => {
                setForceUpdate(prev => prev + 1);
              }, 0);

              return sorted;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    pollMessages();
    pollIntervalRef.current = setInterval(pollMessages, 300);

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
  }, [selectedChild, parent?.id]);

  /**
   * Load data on mount and focus
   */
  useFocusEffect(
    useCallback(() => {
      fetchChildren();
    }, [])
  );

  /**
   * Handle child selection
   */
  const handleSelectChild = (child) => {
    setSelectedChild(child);
    const childId = child.child?.id || child.child_id || child.id;
    loadMessages(childId);
    // Mark messages as read and refresh badge count
    chatService.markAsRead(childId).then(() => {
      refreshCounts(); // Refresh badge count after marking as read
    }).catch(err => {
      console.warn('Failed to mark messages as read:', err);
    });
  };

  /**
   * Get child initials
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
   * Get child name
   */
  const getChildName = (child) => {
    return child.child?.name || child.child?.full_name || child.name || 'Unknown Child';
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
   * Render message
   */
  const renderMessage = (message) => {
    const isParent = message.sender_type === 'parent';
    const isMedia = message.message_type !== 'text';

    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isParent ? styles.messageBubbleSent : styles.messageBubbleReceived,
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
                <Ionicons name="videocam" size={32} color={isParent ? '#fff' : theme.colors.primary} />
                <Text style={[styles.mediaText, isParent && styles.mediaTextWhite]}>Video</Text>
              </View>
            ) : message.message_type === 'audio' && message.media_url ? (
              <View style={styles.audioMessageContainer}>
                <TouchableOpacity
                  style={[styles.audioPlayButton, isParent && styles.audioPlayButtonSent]}
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
                    color={isParent ? '#fff' : theme.colors.primary}
                    style={{ marginLeft: 2 }}
                  />
                </TouchableOpacity>
                <View style={styles.audioWaveformContainer}>
                  <View style={[styles.audioWaveform, isParent && styles.audioWaveformSent]}>
                    {generateWaveformBars(20, playingAudio && playingAudio.messageId === message.id).map((height, index) => (
                      <View
                        key={index}
                        style={[
                          styles.waveformBar,
                          isParent && styles.waveformBarSent,
                          { height: height },
                        ]}
                      />
                    ))}
                  </View>
                  {message.media_duration && (
                    <Text style={[styles.audioDurationText, isParent && styles.audioDurationTextSent]}>
                      {formatAudioDuration(message.media_duration)}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
            {message.message && (
              <Text style={[styles.messageText, isParent && styles.messageTextWhite]}>
                {message.message}
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.messageText, isParent && styles.messageTextWhite]}>
            {message.message}
          </Text>
        )}
        <Text style={[styles.messageTime, isParent && styles.messageTimeWhite]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    );
  };

  if (loading && children.length === 0) {
    return (
      <LinearGradient
        colors={['#fef3f2', '#fee4e2', '#fecaca', '#fda4af']}
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

  // If no child selected, show children list
  if (!selectedChild) {
    return (
      <LinearGradient
        colors={['#fef3f2', '#fee4e2', '#fecaca', '#fda4af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
          <Text style={styles.headerSubtitle}>Select a child to start chatting</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchChildren} tintColor={theme.colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {children.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No children linked</Text>
              <Text style={styles.emptyHint}>Link a child to start chatting</Text>
            </View>
          ) : (
            children.map((child) => {
              const childId = child.child?.id || child.child_id || child.id;
              const childName = getChildName(child);

              return (
                <TouchableOpacity
                  key={childId}
                  style={styles.childCard}
                  onPress={() => handleSelectChild(child)}
                  activeOpacity={0.7}
                >
                  <View style={styles.childCardContent}>
                    <View style={styles.childAvatar}>
                      <Text style={styles.childInitials}>{getInitials(childName)}</Text>
                    </View>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{childName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </LinearGradient>
    );
  }

  // Chat view with selected child
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={['#fef3f2', '#fee4e2', '#fecaca', '#fda4af']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedChild(null);
              setMessages([]);
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {getInitials(getChildName(selectedChild))}
              </Text>
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{getChildName(selectedChild)}</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
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
              <Text style={styles.emptyMessagesHint}>Start a conversation with {getChildName(selectedChild)}</Text>
            </View>
          ) : (
            messages.map(renderMessage)
          )}
        </ScrollView>

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
                  onPress={handleSendMessage}
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerTitle: {
    fontSize: theme.fonts.sizes['2xl'],
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
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
  childCard: {
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  childInitials: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
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
    marginBottom: 2,
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
