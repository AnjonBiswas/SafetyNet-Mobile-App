import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import Input from './Input'
import Button from './Button'
import theme from '../utils/theme'

const RELATIONSHIP_OPTIONS = [
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Friend',
  'Partner',
  'Colleague',
  'Other',
]

function AddTrustedContactModal({ visible, onClose, onAdd, existingCount }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('Friend')
  const [priority, setPriority] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const maxContacts = 3
  const canAddMore = existingCount < maxContacts

  const handleInputChange = (field, value) => {
    if (field === 'name') setName(value)
    else if (field === 'phone') setPhone(value)
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[\d\s-()]+$/.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getPriorityColor = (priorityLevel) => {
    switch (priorityLevel) {
      case 1:
        return theme.colors.error
      case 2:
        return theme.colors.warning
      case 3:
        return theme.colors.info
      default:
        return theme.colors.textMuted
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    if (!canAddMore) {
      Alert.alert('Limit Reached', `You can only add up to ${maxContacts} trusted contacts.`)
      return
    }

    try {
      setLoading(true)
      await onAdd({
        name: name.trim(),
        phone: phone.trim(),
        relation: relationship,
        relationship: relationship,
        priority: priority,
      })

      // Reset form
      setName('')
      setPhone('')
      setRelationship('Friend')
      setPriority(1)
      setErrors({})
      onClose()
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add contact.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setName('')
      setPhone('')
      setRelationship('Friend')
      setPriority(1)
      setErrors({})
      onClose()
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Trusted Contact</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={theme.colors.textDark} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!canAddMore && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
                <Text style={styles.warningText}>
                  You have reached the maximum of {maxContacts} trusted contacts.
                </Text>
              </View>
            )}

            <Input
              label="Contact Name"
              placeholder="Enter contact name"
              value={name}
              onChangeText={(value) => handleInputChange('name', value)}
              error={errors.name}
            />

            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              value={phone}
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
                      relationship === option && styles.relationshipChipActive,
                    ]}
                    onPress={() => setRelationship(option)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.relationshipChipText,
                        relationship === option && styles.relationshipChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.selectContainer}>
              <Text style={styles.selectLabel}>Priority Level (1-3)</Text>
              <View style={styles.priorityContainer}>
                {[1, 2, 3].map((priorityLevel) => (
                  <TouchableOpacity
                    key={priorityLevel}
                    style={[
                      styles.priorityButton,
                      priority === priorityLevel && styles.priorityButtonActive,
                      { borderColor: getPriorityColor(priorityLevel) },
                      priority === priorityLevel && {
                        backgroundColor: getPriorityColor(priorityLevel),
                      },
                    ]}
                    onPress={() => setPriority(priorityLevel)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        priority === priorityLevel && styles.priorityButtonTextActive,
                      ]}
                    >
                      {priorityLevel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.priorityHint}>
                Priority 1 is contacted first in emergencies
              </Text>
            </View>

            <Text style={styles.infoText}>
              {existingCount} of {maxContacts} contacts added
            </Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Button
              title="Add Contact"
              onPress={handleSubmit}
              loading={loading}
              disabled={!canAddMore || loading}
              style={styles.submitButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius['2xl'],
    borderTopRightRadius: theme.borderRadius['2xl'],
    maxHeight: '85%',
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  title: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.textDark,
  },
  content: {
    padding: theme.spacing.lg,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: theme.fonts.sizes.sm,
    color: '#856404',
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
  infoText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.base,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textDark,
  },
  submitButton: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})

export default AddTrustedContactModal
