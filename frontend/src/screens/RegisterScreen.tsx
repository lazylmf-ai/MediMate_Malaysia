/**
 * Register Screen
 * 
 * User registration screen with cultural preferences setup
 * and Malaysian healthcare role selection.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { COLORS, TYPOGRAPHY, APP_SETTINGS } from '@/constants/config';
import type { AuthScreenProps } from '@/types/navigation';
import type { RegisterRequest } from '@/types/auth';

type Props = AuthScreenProps<'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    fullName: '',
    icNumber: '',
    phoneNumber: '',
    healthcareRole: 'patient',
    culturalPreferences: {
      language: 'en',
      timezone: 'Asia/Kuala_Lumpur',
      prayerTimes: {
        enabled: false,
        madhab: 'shafi',
        adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      },
      familyStructure: {
        elderlyMembers: 0,
        children: [],
        primaryCaregiver: false,
      },
      festivals: {
        islamic: false,
        chinese: false,
        hindu: false,
        malaysian: true,
      },
    },
  } as RegisterRequest);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // Multi-step registration

  useEffect(() => {
    if (error) {
      dispatch(clearError());
    }
  }, []);

  const handleInputChange = (field: keyof RegisterRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCulturalPreferenceChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      culturalPreferences: {
        ...prev.culturalPreferences,
        [field]: value,
      },
    }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters long.');
      return false;
    }
    if (formData.password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return false;
    }
    if (formData.icNumber && !/^\d{12}$/.test(formData.icNumber)) {
      Alert.alert('Validation Error', 'IC Number must be 12 digits.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    try {
      await dispatch(registerUser(formData)).unwrap();
      Alert.alert(
        'Registration Successful',
        'Your account has been created. Please log in to continue.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      // Error is handled by Redux state
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const renderStep1 = () => (
    <View style={styles.form}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.fullName}
          onChangeText={(value) => handleInputChange('fullName', value)}
          placeholder="Enter your full name"
          placeholderTextColor={COLORS.gray[400]}
          autoCapitalize="words"
          textContentType="name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          placeholder="Enter your email"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          placeholder="Enter your password"
          placeholderTextColor={COLORS.gray[400]}
          secureTextEntry
          textContentType="newPassword"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password *</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          placeholderTextColor={COLORS.gray[400]}
          secureTextEntry
          textContentType="newPassword"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>IC Number (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.icNumber || ''}
          onChangeText={(value) => handleInputChange('icNumber', value)}
          placeholder="12-digit Malaysian IC"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="numeric"
          maxLength={12}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.phoneNumber || ''}
          onChangeText={(value) => handleInputChange('phoneNumber', value)}
          placeholder="+60123456789"
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Healthcare Role</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.healthcareRole}
            onValueChange={(value) => handleInputChange('healthcareRole', value)}
            style={styles.picker}
          >
            <Picker.Item label="Patient" value="patient" />
            <Picker.Item label="Doctor" value="doctor" />
            <Picker.Item label="Nurse" value="nurse" />
            <Picker.Item label="Pharmacist" value="pharmacist" />
            <Picker.Item label="Administrator" value="admin" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleNextStep}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Cultural Preferences</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Preferred Language</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.culturalPreferences?.language}
            onValueChange={(value) => handleCulturalPreferenceChange('language', value)}
            style={styles.picker}
          >
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Bahasa Malaysia" value="ms" />
            <Picker.Item label="中文 (Chinese)" value="zh" />
            <Picker.Item label="தமிழ் (Tamil)" value="ta" />
          </Picker>
        </View>
      </View>

      <View style={styles.checkboxContainer}>
        <Text style={styles.label}>Festival Preferences</Text>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleCulturalPreferenceChange('festivals', {
            ...formData.culturalPreferences?.festivals,
            islamic: !formData.culturalPreferences?.festivals.islamic,
          })}
        >
          <Text style={styles.checkboxText}>
            {formData.culturalPreferences?.festivals.islamic ? '✓' : '○'} Islamic Festivals
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleCulturalPreferenceChange('festivals', {
            ...formData.culturalPreferences?.festivals,
            chinese: !formData.culturalPreferences?.festivals.chinese,
          })}
        >
          <Text style={styles.checkboxText}>
            {formData.culturalPreferences?.festivals.chinese ? '✓' : '○'} Chinese Festivals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleCulturalPreferenceChange('festivals', {
            ...formData.culturalPreferences?.festivals,
            hindu: !formData.culturalPreferences?.festivals.hindu,
          })}
        >
          <Text style={styles.checkboxText}>
            {formData.culturalPreferences?.festivals.hindu ? '✓' : '○'} Hindu Festivals
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleCulturalPreferenceChange('prayerTimes', {
          ...formData.culturalPreferences?.prayerTimes,
          enabled: !formData.culturalPreferences?.prayerTimes.enabled,
        })}
      >
        <Text style={styles.checkboxText}>
          {formData.culturalPreferences?.prayerTimes.enabled ? '✓' : '○'} Enable Prayer Time Reminders
        </Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setStep(1)}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Join MediMate</Text>
            <Text style={styles.subtitle}>
              Step {step} of 2: {step === 1 ? 'Account Information' : 'Cultural Preferences'}
            </Text>
          </View>

          {step === 1 ? renderStep1() : renderStep2()}

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleBackToLogin}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[800],
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: TYPOGRAPHY.fontSizes.base,
    backgroundColor: COLORS.white,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  picker: {
    height: 50,
  },
  checkboxContainer: {
    marginBottom: 20,
  },
  checkbox: {
    paddingVertical: 12,
  },
  checkboxText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
  },
  errorContainer: {
    backgroundColor: COLORS.error + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flex: 1,
    marginLeft: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  secondaryButton: {
    backgroundColor: COLORS.gray[200],
    flex: 1,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: COLORS.gray[700],
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: COLORS.gray[600],
    fontSize: TYPOGRAPHY.fontSizes.sm,
  },
  loginLink: {
    color: COLORS.secondary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
});

// Install the picker separately
// npm install @react-native-picker/picker