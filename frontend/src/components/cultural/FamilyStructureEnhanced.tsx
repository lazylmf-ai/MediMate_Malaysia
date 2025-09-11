/**
 * Enhanced Family Structure Component
 * 
 * Provides comprehensive family structure configuration with elderly care focus,
 * caregiver responsibilities, and cultural considerations for Malaysian families.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateFamilyStructure } from '@/store/slices/culturalSlice';
import type { EnhancedCulturalProfile, ElderlyCareTradition } from '@/types/cultural';
import type { CulturalProfile } from '@/types/auth';

interface FamilyMember {
  id: string;
  name: string;
  relationship: 'elderly_parent' | 'parent' | 'spouse' | 'child' | 'grandparent' | 'sibling' | 'other';
  age: number;
  specialNeeds?: string;
  medicationReminders: boolean;
  emergencyContact: boolean;
  primaryCaregiver?: boolean;
  culturalRole?: string;
}

interface CaregivingResponsibility {
  type: 'medication' | 'appointment' | 'daily_care' | 'emergency' | 'cultural_observance';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
  culturalContext?: string;
}

interface FamilyStructureEnhancedProps {
  onFamilyStructureChange?: (familyStructure: any) => void;
  showElderlyFocus?: boolean;
  culturalTraditions?: ElderlyCareTradition[];
}

export const FamilyStructureEnhanced: React.FC<FamilyStructureEnhancedProps> = ({
  onFamilyStructureChange,
  showElderlyFocus = true,
  culturalTraditions = [],
}) => {
  const dispatch = useAppDispatch();
  const { profile, isLoading } = useAppSelector((state) => state.cultural);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [caregivingResponsibilities, setCaregivingResponsibilities] = useState<CaregivingResponsibility[]>([]);
  const [isPrimaryCaregiver, setIsPrimaryCaregiver] = useState(false);
  const [elderlyFocusEnabled, setElderlyFocusEnabled] = useState(showElderlyFocus);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddResponsibilityModal, setShowAddResponsibilityModal] = useState(false);
  const [emergencyContactsCount, setEmergencyContactsCount] = useState(0);

  // Initialize from existing profile
  useEffect(() => {
    if (profile?.familyStructure) {
      setIsPrimaryCaregiver(profile.familyStructure.primaryCaregiver);
      
      // Convert existing children to family members
      if (profile.familyStructure.children) {
        const childMembers: FamilyMember[] = profile.familyStructure.children.map((child, index) => ({
          id: `child_${index}`,
          name: `Child ${index + 1}`,
          relationship: 'child',
          age: child.age,
          specialNeeds: child.specialNeeds,
          medicationReminders: false,
          emergencyContact: false,
        }));
        
        setFamilyMembers([...familyMembers, ...childMembers]);
      }

      // Add elderly members if specified
      if (profile.familyStructure.elderlyMembers > 0) {
        const elderlyMembers: FamilyMember[] = Array.from(
          { length: profile.familyStructure.elderlyMembers },
          (_, index) => ({
            id: `elderly_${index}`,
            name: `Elderly Member ${index + 1}`,
            relationship: 'elderly_parent',
            age: 70,
            medicationReminders: true,
            emergencyContact: true,
          })
        );
        
        setFamilyMembers(prev => [...prev, ...elderlyMembers]);
      }
    }
  }, [profile]);

  // Count emergency contacts
  useEffect(() => {
    const emergencyCount = familyMembers.filter(member => member.emergencyContact).length;
    setEmergencyContactsCount(emergencyCount);
  }, [familyMembers]);

  const addFamilyMember = (memberData: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = {
      ...memberData,
      id: `member_${Date.now()}`,
    };

    setFamilyMembers(prev => [...prev, newMember]);
    setShowAddMemberModal(false);
  };

  const updateFamilyMember = (memberId: string, updates: Partial<FamilyMember>) => {
    setFamilyMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, ...updates } : member
      )
    );
  };

  const removeFamilyMember = (memberId: string) => {
    Alert.alert(
      'Remove Family Member',
      'Are you sure you want to remove this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFamilyMembers(prev => prev.filter(member => member.id !== memberId));
          },
        },
      ]
    );
  };

  const addCaregivingResponsibility = (responsibility: Omit<CaregivingResponsibility, 'id'>) => {
    setCaregivingResponsibilities(prev => [...prev, responsibility]);
    setShowAddResponsibilityModal(false);
  };

  const saveFamilyStructure = async () => {
    const elderlyMembers = familyMembers.filter(member => 
      member.relationship === 'elderly_parent' || member.relationship === 'grandparent'
    );

    const children = familyMembers
      .filter(member => member.relationship === 'child')
      .map(child => ({
        age: child.age,
        specialNeeds: child.specialNeeds,
      }));

    const enhancedFamilyStructure = {
      elderlyMembers: elderlyMembers.length,
      children,
      primaryCaregiver: isPrimaryCaregiver,
      // Enhanced fields
      familyMembers,
      caregivingResponsibilities,
      emergencyContacts: familyMembers.filter(member => member.emergencyContact),
      culturalCaregiving: {
        elderlyFocused: elderlyFocusEnabled,
        traditions: culturalTraditions,
      },
    };

    try {
      await dispatch(updateFamilyStructure(enhancedFamilyStructure));
      
      if (onFamilyStructureChange) {
        onFamilyStructureChange(enhancedFamilyStructure);
      }

      Alert.alert('Success', 'Family structure updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update family structure');
    }
  };

  const renderFamilyMember = (member: FamilyMember) => (
    <View key={member.id} style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <Text style={styles.memberName}>{member.name}</Text>
        <TouchableOpacity
          onPress={() => removeFamilyMember(member.id)}
          style={styles.removeButton}
        >
          <Text style={styles.removeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.memberDetails}>
        <Text style={styles.memberInfo}>
          {member.relationship.replace('_', ' ').toUpperCase()} • Age: {member.age}
        </Text>
        
        {member.specialNeeds && (
          <Text style={styles.specialNeeds}>Special Needs: {member.specialNeeds}</Text>
        )}

        {member.culturalRole && (
          <Text style={styles.culturalRole}>Cultural Role: {member.culturalRole}</Text>
        )}
      </View>

      <View style={styles.memberToggles}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Medication Reminders</Text>
          <Switch
            value={member.medicationReminders}
            onValueChange={(value) => updateFamilyMember(member.id, { medicationReminders: value })}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Emergency Contact</Text>
          <Switch
            value={member.emergencyContact}
            onValueChange={(value) => updateFamilyMember(member.id, { emergencyContact: value })}
          />
        </View>

        {member.relationship.includes('elderly') && (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Primary Care Recipient</Text>
            <Switch
              value={member.primaryCaregiver || false}
              onValueChange={(value) => updateFamilyMember(member.id, { primaryCaregiver: value })}
            />
          </View>
        )}
      </View>
    </View>
  );

  const renderCaregivingResponsibility = (responsibility: CaregivingResponsibility, index: number) => (
    <View key={index} style={styles.responsibilityCard}>
      <Text style={styles.responsibilityType}>
        {responsibility.type.replace('_', ' ').toUpperCase()}
      </Text>
      <Text style={styles.responsibilityDescription}>{responsibility.description}</Text>
      <Text style={styles.responsibilityFrequency}>
        Frequency: {responsibility.frequency} 
        {responsibility.timeOfDay && ` • Time: ${responsibility.timeOfDay}`}
      </Text>
      {responsibility.culturalContext && (
        <Text style={styles.culturalContext}>
          Cultural Context: {responsibility.culturalContext}
        </Text>
      )}
    </View>
  );

  const renderElderlyCareTraditions = () => {
    if (!elderlyFocusEnabled || culturalTraditions.length === 0) return null;

    return (
      <View style={styles.traditionsSection}>
        <Text style={styles.sectionTitle}>Elderly Care Traditions</Text>
        {culturalTraditions.map((tradition, index) => (
          <View key={index} style={styles.traditionCard}>
            <Text style={styles.traditionName}>{tradition.name}</Text>
            <Text style={styles.traditionDescription}>{tradition.description}</Text>
            <View style={styles.practicesContainer}>
              {tradition.practices.map((practice, pIndex) => (
                <Text key={pIndex} style={styles.practice}>• {practice}</Text>
              ))}
            </View>
            {tradition.relevantMedicationTimes && (
              <Text style={styles.medicationTimes}>
                Medication timing: {tradition.relevantMedicationTimes.join(', ')}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Family Structure & Care</Text>
        <Text style={styles.subtitle}>
          Configure your family members and caregiving responsibilities
        </Text>
      </View>

      <View style={styles.primaryCaregiverSection}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>I am a primary caregiver</Text>
          <Switch
            value={isPrimaryCaregiver}
            onValueChange={setIsPrimaryCaregiver}
          />
        </View>
        
        {showElderlyFocus && (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Focus on elderly care</Text>
            <Switch
              value={elderlyFocusEnabled}
              onValueChange={setElderlyFocusEnabled}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Members ({familyMembers.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddMemberModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        {emergencyContactsCount < 2 && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>
              ⚠️ Add at least 2 emergency contacts for safety
            </Text>
          </View>
        )}

        {familyMembers.map(renderFamilyMember)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Caregiving Responsibilities ({caregivingResponsibilities.length})
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddResponsibilityModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {caregivingResponsibilities.map(renderCaregivingResponsibility)}
      </View>

      {renderElderlyCareTraditions()}

      <View style={styles.saveSection}>
        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={saveFamilyStructure}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Family Structure</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Add Member Modal */}
      <AddMemberModal
        visible={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        onAdd={addFamilyMember}
      />

      {/* Add Responsibility Modal */}
      <AddResponsibilityModal
        visible={showAddResponsibilityModal}
        onClose={() => setShowAddResponsibilityModal(false)}
        onAdd={addCaregivingResponsibility}
      />
    </ScrollView>
  );
};

// Add Member Modal Component
const AddMemberModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onAdd: (member: Omit<FamilyMember, 'id'>) => void;
}> = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<FamilyMember['relationship']>('other');
  const [age, setAge] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !age.trim()) {
      Alert.alert('Error', 'Please fill in name and age');
      return;
    }

    onAdd({
      name: name.trim(),
      relationship,
      age: parseInt(age),
      specialNeeds: specialNeeds.trim() || undefined,
      medicationReminders: relationship.includes('elderly'),
      emergencyContact: false,
    });

    // Reset form
    setName('');
    setAge('');
    setSpecialNeeds('');
    setRelationship('other');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Family Member</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCloseButton}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Relationship</Text>
            <View style={styles.relationshipButtons}>
              {(['elderly_parent', 'parent', 'spouse', 'child', 'grandparent', 'sibling', 'other'] as const).map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[
                    styles.relationshipButton,
                    relationship === rel && styles.relationshipButtonActive
                  ]}
                  onPress={() => setRelationship(rel)}
                >
                  <Text style={[
                    styles.relationshipButtonText,
                    relationship === rel && styles.relationshipButtonTextActive
                  ]}>
                    {rel.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={age}
              onChangeText={setAge}
              placeholder="Enter age"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Needs (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={specialNeeds}
              onChangeText={setSpecialNeeds}
              placeholder="Any special care requirements"
              multiline
            />
          </View>

          <TouchableOpacity style={styles.modalAddButton} onPress={handleAdd}>
            <Text style={styles.modalAddButtonText}>Add Family Member</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Add Responsibility Modal Component  
const AddResponsibilityModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onAdd: (responsibility: CaregivingResponsibility) => void;
}> = ({ visible, onClose, onAdd }) => {
  const [type, setType] = useState<CaregivingResponsibility['type']>('medication');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<CaregivingResponsibility['frequency']>('daily');

  const handleAdd = () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    onAdd({
      type,
      description: description.trim(),
      frequency,
    });

    setDescription('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Caregiving Responsibility</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCloseButton}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeButtons}>
              {(['medication', 'appointment', 'daily_care', 'emergency', 'cultural_observance'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeButton,
                    type === t && styles.typeButtonActive
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === t && styles.typeButtonTextActive
                  ]}>
                    {t.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the responsibility"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Frequency</Text>
            <View style={styles.frequencyButtons}>
              {(['daily', 'weekly', 'monthly', 'as_needed'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    frequency === freq && styles.frequencyButtonActive
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    frequency === freq && styles.frequencyButtonTextActive
                  ]}>
                    {freq.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.modalAddButton} onPress={handleAdd}>
            <Text style={styles.modalAddButtonText}>Add Responsibility</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  primaryCaregiverSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  memberCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  removeButton: {
    backgroundColor: '#dc3545',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberDetails: {
    marginBottom: 15,
  },
  memberInfo: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  specialNeeds: {
    fontSize: 14,
    color: '#28a745',
    fontStyle: 'italic',
  },
  culturalRole: {
    fontSize: 14,
    color: '#007bff',
    fontStyle: 'italic',
  },
  memberToggles: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 10,
  },
  responsibilityCard: {
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  responsibilityType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 4,
  },
  responsibilityDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  responsibilityFrequency: {
    fontSize: 12,
    color: '#6c757d',
  },
  culturalContext: {
    fontSize: 12,
    color: '#007bff',
    fontStyle: 'italic',
    marginTop: 2,
  },
  traditionsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  traditionCard: {
    backgroundColor: '#f0f8f7',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  traditionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  traditionDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  practicesContainer: {
    marginBottom: 8,
  },
  practice: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 2,
  },
  medicationTimes: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '600',
  },
  saveSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#dc3545',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  relationshipButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  relationshipButtonActive: {
    backgroundColor: '#007bff',
  },
  relationshipButtonText: {
    fontSize: 12,
    color: '#495057',
  },
  relationshipButtonTextActive: {
    color: '#fff',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeButtonActive: {
    backgroundColor: '#28a745',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#495057',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#ffc107',
  },
  frequencyButtonText: {
    fontSize: 12,
    color: '#495057',
  },
  frequencyButtonTextActive: {
    color: '#000',
  },
  modalAddButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalAddButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});