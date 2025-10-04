/**
 * Share Button Component
 *
 * Allows users to share educational content with family circle members.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import educationIntegrationService from '@/services/educationIntegrationService';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
}

interface ShareButtonProps {
  contentId: string;
  contentTitle: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ contentId, contentTitle }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);

  // Mock family members - in production this would come from family circle API
  const familyMembers: FamilyMember[] = [
    { id: '1', name: 'Ahmad', relationship: 'Spouse' },
    { id: '2', name: 'Siti', relationship: 'Mother' },
    { id: '3', name: 'Fatimah', relationship: 'Daughter' },
  ];

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleShare = async () => {
    if (selectedMembers.length === 0) {
      Alert.alert('No Members Selected', 'Please select at least one family member to share with.');
      return;
    }

    try {
      setSharing(true);

      const result = await educationIntegrationService.shareContentWithFamily(
        contentId,
        selectedMembers
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Content shared with ${selectedMembers.length} family member(s)`
        );
        setShowModal(false);
        setSelectedMembers([]);
      } else {
        Alert.alert('Error', result.error || 'Failed to share content');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share content. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={() => setShowModal(true)}
        accessibilityLabel="Share with family"
        accessibilityHint="Share this content with your family members"
      >
        <Text style={styles.shareIcon}>📤</Text>
        <Text style={styles.shareText}>Share with Family</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share with Family</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
                accessibilityLabel="Close"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content Title */}
            <Text style={styles.contentTitle} numberOfLines={2}>
              {contentTitle}
            </Text>

            {/* Family Members List */}
            <FlatList
              data={familyMembers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberItem}
                  onPress={() => toggleMember(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedMembers.includes(item.id) }}
                >
                  <View style={styles.memberInfo}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{item.name.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.memberName}>{item.name}</Text>
                      <Text style={styles.memberRelationship}>{item.relationship}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedMembers.includes(item.id) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedMembers.includes(item.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={styles.memberList}
            />

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowModal(false)}
                disabled={sharing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.shareActionButton]}
                onPress={handleShare}
                disabled={sharing || selectedMembers.length === 0}
              >
                <Text style={styles.shareActionButtonText}>
                  {sharing ? 'Sharing...' : `Share (${selectedMembers.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    minHeight: 44,
  },
  shareIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  shareText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
  },
  closeButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.gray[600],
  },
  contentTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginBottom: 16,
  },
  memberList: {
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    minHeight: 44,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.white,
  },
  memberName: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[900],
  },
  memberRelationship: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: COLORS.gray[200],
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[700],
  },
  shareActionButton: {
    backgroundColor: COLORS.primary,
  },
  shareActionButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.white,
  },
});

export default ShareButton;
