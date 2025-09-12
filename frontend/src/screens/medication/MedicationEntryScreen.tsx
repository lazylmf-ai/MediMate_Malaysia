/**
 * Medication Entry Screen
 * 
 * Main screen for manual medication entry with:
 * - Step-by-step medication entry flow
 * - Stream C database integration for search and validation
 * - Cultural awareness and multilingual support
 * - OCR integration support (coordinate with Stream B)
 * - Elderly-friendly UI design patterns
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useMedicationEntry } from '../../hooks/medication/useMedicationEntry';
import { useMedicationScheduling } from '../../hooks/medication/useMedicationScheduling';
import { MedicationDosage, MedicationCategory } from '../../types/medication';

// Component imports (these would be created)
import SearchableDropdown from '../../components/common/SearchableDropdown';
import ValidationMessage from '../../components/common/ValidationMessage';
import ProgressIndicator from '../../components/common/ProgressIndicator';
import CulturalNote from '../../components/common/CulturalNote';

interface MedicationEntryScreenProps {
  route?: {
    params?: {
      ocrData?: any; // OCR data from Stream A photo capture
      medicationId?: string; // For editing existing medication
    };
  };
}

const MedicationEntryScreen: React.FC<MedicationEntryScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const {
    step,
    formData,
    selectedMedication,
    searchResults,
    autocompleteResults,
    validationResult,
    isSubmitting,
    error,
    culturalPreferences,
    searchMedicationDatabase,
    getAutocompleteSuggestions,
    selectMedication,
    processOCRData,
    updateFormData,
    submitMedication,
    nextStep,
    previousStep,
    validateForm,
    initializeForm,
  } = useMedicationEntry();

  const { getScheduleRecommendation } = useMedicationScheduling();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize form and process OCR data if available
  useEffect(() => {
    initializeForm();
    
    if (route?.params?.ocrData) {
      processOCRData(route.params.ocrData);
    }
  }, [route?.params?.ocrData, initializeForm, processOCRData]);

  // Handle medication search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      searchMedicationDatabase(query);
      getAutocompleteSuggestions(query);
    }
  }, [searchMedicationDatabase, getAutocompleteSuggestions]);

  // Handle form field updates
  const handleFieldUpdate = useCallback((field: string, value: any) => {
    updateFormData({ [field]: value });
  }, [updateFormData]);

  // Handle dosage field updates
  const handleDosageUpdate = useCallback((field: keyof MedicationDosage, value: any) => {
    const currentDosage = formData.dosage || {};
    updateFormData({
      dosage: { ...currentDosage, [field]: value },
    });
  }, [formData.dosage, updateFormData]);

  // Handle medication submission
  const handleSubmit = useCallback(async () => {
    const result = await submitMedication();
    
    if (result.success) {
      Alert.alert(
        culturalPreferences.language === 'ms' ? 'Berjaya' : 'Success',
        culturalPreferences.language === 'ms' 
          ? 'Ubat telah disimpan dengan jayanya'
          : 'Medication has been saved successfully',
        [
          {
            text: culturalPreferences.language === 'ms' ? 'OK' : 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert(
        culturalPreferences.language === 'ms' ? 'Ralat' : 'Error',
        result.error || 'Failed to save medication'
      );
    }
  }, [submitMedication, culturalPreferences, navigation]);

  // Render search step
  const renderSearchStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {culturalPreferences.language === 'ms' 
          ? 'Cari Ubat'
          : 'Search Medication'
        }
      </Text>
      
      <TextInput
        style={styles.searchInput}
        placeholder={
          culturalPreferences.language === 'ms'
            ? 'Masukkan nama ubat...'
            : 'Enter medication name...'
        }
        value={searchQuery}
        onChangeText={handleSearch}
        autoCapitalize="words"
      />

      {/* Search Results */}
      {searchResults && searchResults.medications.length > 0 && (
        <View style={styles.searchResults}>
          <Text style={styles.sectionTitle}>
            {culturalPreferences.language === 'ms' 
              ? 'Keputusan Carian'
              : 'Search Results'
            }
          </Text>
          
          {searchResults.medications.slice(0, 5).map((medication) => (
            <TouchableOpacity
              key={medication.id}
              style={styles.medicationItem}
              onPress={() => selectMedication(medication)}
            >
              <View style={styles.medicationInfo}>
                <Text style={styles.medicationName}>{medication.name}</Text>
                {medication.genericName && (
                  <Text style={styles.genericName}>{medication.genericName}</Text>
                )}
                <Text style={styles.manufacturer}>{medication.manufacturer}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Manual Entry Option */}
      <TouchableOpacity
        style={styles.manualEntryButton}
        onPress={() => nextStep()}
      >
        <Ionicons name="create-outline" size={24} color="#007AFF" />
        <Text style={styles.manualEntryText}>
          {culturalPreferences.language === 'ms'
            ? 'Masukkan Ubat Secara Manual'
            : 'Enter Medication Manually'
          }
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render details step
  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {culturalPreferences.language === 'ms' 
          ? 'Butiran Ubat'
          : 'Medication Details'
        }
      </Text>

      {/* Medication Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {culturalPreferences.language === 'ms' ? 'Nama Ubat' : 'Medication Name'} *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            validationResult?.errors.name && styles.inputError
          ]}
          value={formData.name || ''}
          onChangeText={(value) => handleFieldUpdate('name', value)}
          placeholder={
            culturalPreferences.language === 'ms'
              ? 'Contoh: Paracetamol'
              : 'e.g., Paracetamol'
          }
        />
        {validationResult?.errors.name && (
          <ValidationMessage 
            messages={validationResult.errors.name} 
            type="error" 
          />
        )}
      </View>

      {/* Generic Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {culturalPreferences.language === 'ms' ? 'Nama Generik' : 'Generic Name'}
        </Text>
        <TextInput
          style={styles.textInput}
          value={formData.genericName || ''}
          onChangeText={(value) => handleFieldUpdate('genericName', value)}
          placeholder={
            culturalPreferences.language === 'ms'
              ? 'Nama saintifik ubat'
              : 'Scientific name of the medication'
          }
        />
      </View>

      {/* Dosage Section */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {culturalPreferences.language === 'ms' ? 'Dos' : 'Dosage'} *
        </Text>
        
        <View style={styles.dosageContainer}>
          <TextInput
            style={[
              styles.dosageAmountInput,
              validationResult?.errors.dosage && styles.inputError
            ]}
            value={formData.dosage?.amount?.toString() || ''}
            onChangeText={(value) => handleDosageUpdate('amount', parseFloat(value) || 0)}
            placeholder="500"
            keyboardType="numeric"
          />
          
          <SearchableDropdown
            style={styles.dosageUnitDropdown}
            options={[
              { label: 'mg', value: 'mg' },
              { label: 'ml', value: 'ml' },
              { label: 'tablet', value: 'tablet' },
              { label: 'capsule', value: 'capsule' },
              { label: 'drops', value: 'drops' },
            ]}
            value={formData.dosage?.unit || 'mg'}
            onSelect={(value) => handleDosageUpdate('unit', value)}
          />
        </View>
        
        {validationResult?.errors.dosage && (
          <ValidationMessage 
            messages={validationResult.errors.dosage} 
            type="error" 
          />
        )}
      </View>

      {/* Medication Form */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {culturalPreferences.language === 'ms' ? 'Bentuk Ubat' : 'Medication Form'}
        </Text>
        <SearchableDropdown
          options={[
            { 
              label: culturalPreferences.language === 'ms' ? 'Tablet' : 'Tablet', 
              value: 'tablet' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Cecair' : 'Liquid', 
              value: 'liquid' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Suntikan' : 'Injection', 
              value: 'injection' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Krim' : 'Topical', 
              value: 'topical' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Penyedut' : 'Inhaler', 
              value: 'inhaler' 
            },
          ]}
          value={formData.dosage?.form || 'tablet'}
          onSelect={(value) => handleDosageUpdate('form', value)}
        />
      </View>

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {culturalPreferences.language === 'ms' ? 'Kategori' : 'Category'}
        </Text>
        <SearchableDropdown
          options={[
            { 
              label: culturalPreferences.language === 'ms' ? 'Preskripsi' : 'Prescription', 
              value: 'prescription' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Tanpa Preskripsi' : 'Over-the-Counter', 
              value: 'otc' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Suplemen' : 'Supplement', 
              value: 'supplement' 
            },
            { 
              label: culturalPreferences.language === 'ms' ? 'Tradisional' : 'Traditional', 
              value: 'traditional' 
            },
          ]}
          value={formData.category || 'prescription'}
          onSelect={(value) => handleFieldUpdate('category', value)}
        />
      </View>

      {/* Advanced Options Toggle */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Text style={styles.advancedToggleText}>
          {culturalPreferences.language === 'ms' ? 'Pilihan Lanjutan' : 'Advanced Options'}
        </Text>
        <Ionicons 
          name={showAdvanced ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#007AFF" 
        />
      </TouchableOpacity>

      {/* Advanced Options */}
      {showAdvanced && (
        <View style={styles.advancedSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {culturalPreferences.language === 'ms' ? 'Arahan Penggunaan' : 'Instructions'}
            </Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.instructions || ''}
              onChangeText={(value) => handleFieldUpdate('instructions', value)}
              placeholder={
                culturalPreferences.language === 'ms'
                  ? 'Contoh: Ambil selepas makan'
                  : 'e.g., Take after meals'
              }
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {culturalPreferences.language === 'ms' ? 'Nota Budaya' : 'Cultural Notes'}
            </Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.culturalNotes || ''}
              onChangeText={(value) => handleFieldUpdate('culturalNotes', value)}
              placeholder={
                culturalPreferences.language === 'ms'
                  ? 'Pertimbangan budaya atau agama'
                  : 'Cultural or religious considerations'
              }
              multiline
            />
          </View>
        </View>
      )}

      {/* Cultural Warnings */}
      {validationResult?.warnings.cultural && (
        <CulturalNote 
          messages={validationResult.warnings.cultural}
          type="warning"
        />
      )}

      {/* Validation Suggestions */}
      {validationResult?.suggestions.length && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>
            {culturalPreferences.language === 'ms' ? 'Cadangan' : 'Suggestions'}
          </Text>
          {validationResult.suggestions.map((suggestion, index) => (
            <Text key={index} style={styles.suggestionText}>
              • {suggestion}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  // Render step navigation
  const renderStepNavigation = () => (
    <View style={styles.navigationContainer}>
      {step !== 'search' && (
        <TouchableOpacity style={styles.navButton} onPress={previousStep}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
          <Text style={styles.navButtonText}>
            {culturalPreferences.language === 'ms' ? 'Kembali' : 'Back'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.navSpacer} />

      {step === 'details' && (
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.primaryButton,
            (!validationResult?.isValid || isSubmitting) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={!validationResult?.isValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={[styles.navButtonText, styles.primaryButtonText]}>
                {culturalPreferences.language === 'ms' ? 'Simpan' : 'Save'}
              </Text>
              <Ionicons name="checkmark" size={24} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {culturalPreferences.language === 'ms' 
              ? 'Tambah Ubat'
              : 'Add Medication'
            }
          </Text>
          
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <ProgressIndicator
          currentStep={step === 'search' ? 1 : 2}
          totalSteps={2}
          labels={
            culturalPreferences.language === 'ms'
              ? ['Cari', 'Butiran']
              : ['Search', 'Details']
          }
        />

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'search' && renderSearchStep()}
          {step === 'details' && renderDetailsStep()}
          
          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation */}
        {renderStepNavigation()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginBottom: 20,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  medicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  genericName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  manufacturer: {
    fontSize: 12,
    color: '#999',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  manualEntryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  dosageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dosageAmountInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  dosageUnitDropdown: {
    flex: 1,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  advancedToggleText: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
  },
  advancedSection: {
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    paddingTop: 20,
  },
  suggestionsContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 0,
  },
  errorText: {
    fontSize: 14,
    color: '#cc0000',
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  navSpacer: {
    flex: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginHorizontal: 8,
  },
  primaryButtonText: {
    color: '#fff',
  },
});

export default MedicationEntryScreen;