import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import trustedContactService from '../services/trustedContactService';
import Input from '../components/Input';
import Button from '../components/Button';
import theme from '../utils/theme';

const MAX_CONTACTS = 3;
const RELATIONSHIP_OPTIONS = [
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Friend',
  'Partner',
  'Colleague',
  'Other',
];

/**
 * TrustedContactsScreen
 * Manages trusted emergency contacts (max 3)
 */
function TrustedContactsScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isMaxReached, setIsMaxReached] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: 'Friend',
    priority: 1,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadContacts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const loadContacts = async () => {
    try {
      setLoading(true);
      const result = await trustedContactService.getContacts();
      if (result.success) {
        setContacts(result.data || []);
        const maxReached = await trustedContactService.isMaxReached();
        setIsMaxReached(maxReached);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.relationship) {
      newErrors.relationship = 'Relationship is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddContact = () => {
    if (isMaxReached) {
      Alert.alert(
        'Maximum Reached',
        `You can only add up to ${MAX_CONTACTS} trusted contacts. Please remove one to add another.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      relationship: 'Friend',
      priority: contacts.length + 1,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      priority: contact.priority,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSaveContact = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      let result;
      if (editingContact) {
        result = await trustedContactService.updateContact(editingContact.id, formData);
      } else {
        result = await trustedContactService.addContact(formData);
      }

      if (result.success) {
        Alert.alert('Success', result.message || 'Contact saved successfully', [
          {
            text: 'OK',
            onPress: () => {
              setShowModal(false);
              loadContacts();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const handleDeleteContact = (contact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await trustedContactService.deleteContact(contact.id);
              if (result.success) {
                Alert.alert('Success', 'Contact deleted successfully');
                loadContacts();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete contact');
              }
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1:
        return theme.colors.error;
      case 2:
        return theme.colors.warning;
      case 3:
        return theme.colors.info;
      default:
        return theme.colors.textMuted;
    }
  };

  const renderContactCard = (contact) => (
    <View key={contact.id} style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>{getInitials(contact.name)}</Text>
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(contact.priority) },
              ]}
            >
              <Text style={styles.priorityText}>#{contact.priority}</Text>
            </View>
          </View>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
          <Text style={styles.contactRelationship}>{contact.relationship}</Text>
        </View>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditContact(contact)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteContact(contact)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={theme.colors.textMuted} />
      <Text style={styles.emptyTitle}>No Trusted Contacts</Text>
      <Text style={styles.emptyText}>
        Add up to {MAX_CONTACTS} trusted contacts who can be notified in emergencies.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#FFF0F5', '#FFF0F5', '#FFB6C1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1.5 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
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
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.info} />
          <Text style={styles.infoText}>
            You can add up to {MAX_CONTACTS} trusted contacts. {contacts.length} of {MAX_CONTACTS}{' '}
            added.
          </Text>
        </View>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => renderContactCard(contact))}
          </View>
        )}

        {/* Add Contact Button */}
        <TouchableOpacity
          style={[styles.addButton, isMaxReached && styles.addButtonDisabled]}
          onPress={handleAddContact}
          disabled={isMaxReached}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={isMaxReached ? theme.colors.textMuted : theme.colors.textWhite}
          />
          <Text
            style={[
              styles.addButtonText,
              isMaxReached && styles.addButtonTextDisabled,
            ]}
          >
            {isMaxReached ? 'Maximum Reached' : 'Add Trusted Contact'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Contact Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'Add Trusted Contact'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Input
                label="Contact Name"
                placeholder="Enter contact name"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                error={errors.name}
              />
              <Input
                label="Phone Number"
                placeholder="Enter phone number"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                error={errors.phone}
              />
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>Relationship</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relationshipScroll}
                >
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.relationshipChip,
                        formData.relationship === option && styles.relationshipChipActive,
                      ]}
                      onPress={() => handleInputChange('relationship', option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.relationshipChipText,
                          formData.relationship === option && styles.relationshipChipTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.relationship && (
                  <Text style={styles.errorText}>{errors.relationship}</Text>
                )}
              </View>
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>Priority Level (1-3)</Text>
                <View style={styles.priorityContainer}>
                  {[1, 2, 3].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        formData.priority === priority && styles.priorityButtonActive,
                        { borderColor: getPriorityColor(priority) },
                        formData.priority === priority && {
                          backgroundColor: getPriorityColor(priority),
                        },
                      ]}
                      onPress={() => handleInputChange('priority', priority)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.priorityButtonText,
                          formData.priority === priority && styles.priorityButtonTextActive,
                        ]}
                      >
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.priorityHint}>
                  Priority 1 is contacted first in emergencies
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowModal(false);
                  setFormData({
                    name: '',
                    phone: '',
                    relationship: 'Friend',
                    priority: 1,
                  });
                  setErrors({});
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title={editingContact ? 'Update' : 'Add Contact'}
                onPress={handleSaveContact}
                style={styles.modalSaveButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: theme.spacing['2xl'],
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.base,
    alignItems: 'flex-start',
    ...theme.shadows.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    marginLeft: theme.spacing.sm,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  contactsList: {
    marginBottom: theme.spacing.base,
  },
  contactCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.card,
  },
  contactHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  contactAvatarText: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  contactName: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
    marginRight: theme.spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  priorityText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textWhite,
  },
  contactPhone: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.xs,
  },
  contactRelationship: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionButton: {
    padding: theme.spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.borderLight,
  },
  addButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    marginLeft: theme.spacing.sm,
  },
  addButtonTextDisabled: {
    color: theme.colors.textMuted,
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
    maxHeight: '85%',
    paddingBottom: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalScroll: {
    padding: theme.spacing.lg,
  },
  selectContainer: {
    marginBottom: theme.spacing.md,
  },
  selectLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
  },
  relationshipScroll: {
    paddingVertical: theme.spacing.xs,
  },
  relationshipChip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
  },
  relationshipChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  relationshipChipText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textDark,
    fontWeight: theme.fonts.weights.medium,
  },
  relationshipChipTextActive: {
    color: theme.colors.textWhite,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityButtonText: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  priorityButtonTextActive: {
    color: theme.colors.textWhite,
  },
  priorityHint: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  errorText: {
    marginTop: theme.spacing.xs,
    color: theme.colors.error,
    fontSize: theme.fonts.sizes.sm,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  modalCancelText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  modalSaveButton: {
    flex: 1,
  },
});

export default TrustedContactsScreen;

