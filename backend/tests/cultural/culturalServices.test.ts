/**
 * Cultural Intelligence Services Test Suite
 * Comprehensive tests for Malaysian cultural healthcare services
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { PrayerTimeService } from '../../src/services/cultural/prayerTimeService';
import { LanguageService } from '../../src/services/cultural/languageService';
import { HalalValidationService } from '../../src/services/cultural/halalValidationService';
import { CulturalCalendarService } from '../../src/services/cultural/culturalCalendarService';
import { DietaryService } from '../../src/services/cultural/dietaryService';
import { CulturalPreferenceService } from '../../src/services/cultural/culturalPreferenceService';

// Mock external dependencies
jest.mock('axios');

describe('Cultural Intelligence Services', () => {
  let prayerTimeService: PrayerTimeService;
  let languageService: LanguageService;
  let halalValidationService: HalalValidationService;
  let culturalCalendarService: CulturalCalendarService;
  let dietaryService: DietaryService;
  let culturalPreferenceService: CulturalPreferenceService;

  beforeAll(async () => {
    // Initialize services
    prayerTimeService = new PrayerTimeService();
    languageService = new LanguageService();
    halalValidationService = new HalalValidationService();
    culturalCalendarService = new CulturalCalendarService();
    dietaryService = new DietaryService();
    culturalPreferenceService = new CulturalPreferenceService();

    try {
      // Initialize all services
      await Promise.all([
        languageService.initialize(),
        halalValidationService.initialize(),
        culturalCalendarService.initialize(),
        dietaryService.initialize(),
        culturalPreferenceService.initialize()
      ]);
    } catch (error) {
      console.warn('Some services failed to initialize in test environment:', error);
      // Continue with tests - services should handle initialization failures gracefully
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  // ============================================================================
  // PRAYER TIME SERVICE TESTS
  // ============================================================================

  describe('Prayer Time Service', () => {
    test('should get prayer times for valid Malaysian state', async () => {
      const stateCode = 'KUL';
      const date = new Date('2024-01-15');

      const prayerTimes = await prayerTimeService.getPrayerTimes(stateCode, date);

      expect(prayerTimes).toBeDefined();
      expect(prayerTimes.state_code).toBe(stateCode);
      expect(prayerTimes.date).toBe('2024-01-15');
      expect(prayerTimes.prayer_times).toHaveProperty('fajr');
      expect(prayerTimes.prayer_times).toHaveProperty('dhuhr');
      expect(prayerTimes.prayer_times).toHaveProperty('maghrib');
      expect(prayerTimes.qibla_direction).toBe('292.5°');
    });

    test('should handle invalid state code', async () => {
      await expect(prayerTimeService.getPrayerTimes('XXX')).rejects.toThrow(
        'Invalid Malaysian state code: XXX'
      );
    });

    test('should get current prayer status', async () => {
      const stateCode = 'SGR';
      
      const status = await prayerTimeService.getCurrentPrayerStatus(stateCode);

      expect(status).toHaveProperty('next_prayer');
      expect(status.next_prayer).toHaveProperty('name');
      expect(status.next_prayer).toHaveProperty('time');
      expect(status.next_prayer).toHaveProperty('minutes_until');
      expect(status).toHaveProperty('prayer_times');
    });

    test('should check if current time is prayer time', async () => {
      const stateCode = 'JHR';
      
      const prayerCheck = await prayerTimeService.isPrayerTime(stateCode, 15);

      expect(prayerCheck).toHaveProperty('is_prayer_time');
      expect(typeof prayerCheck.is_prayer_time).toBe('boolean');
    });

    test('should get Ramadan adjustments', async () => {
      const stateCode = 'MLK';
      const date = new Date('2024-03-15'); // Mock Ramadan period

      const adjustments = await prayerTimeService.getRamadanAdjustments(stateCode, date);

      expect(adjustments).toHaveProperty('is_ramadan');
      if (adjustments.is_ramadan) {
        expect(adjustments).toHaveProperty('fasting_period');
        expect(adjustments).toHaveProperty('recommended_appointment_times');
        expect(adjustments).toHaveProperty('avoid_appointment_times');
      }
    });

    test('should validate state codes', () => {
      expect(prayerTimeService.isValidStateCode('KUL')).toBe(true);
      expect(prayerTimeService.isValidStateCode('SGR')).toBe(true);
      expect(prayerTimeService.isValidStateCode('XXX')).toBe(false);
      expect(prayerTimeService.isValidStateCode('')).toBe(false);
    });

    test('should get supported states', () => {
      const states = prayerTimeService.getSupportedStates();

      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThan(10);
      expect(states.every(state => state.code && state.name && state.zone)).toBe(true);
    });

    test('should get prayer times for date range', async () => {
      const stateCode = 'PNG';
      const startDate = new Date('2024-01-01');
      const days = 7;

      const prayerTimesRange = await prayerTimeService.getPrayerTimesRange(stateCode, startDate, days);

      expect(Array.isArray(prayerTimesRange)).toBe(true);
      expect(prayerTimesRange.length).toBeLessThanOrEqual(days);
      prayerTimesRange.forEach(pt => {
        expect(pt).toHaveProperty('prayer_times');
        expect(pt.state_code).toBe(stateCode);
      });
    });
  });

  // ============================================================================
  // LANGUAGE SERVICE TESTS
  // ============================================================================

  describe('Language Service', () => {
    test('should translate medical terms to Malay', async () => {
      const text = 'doctor';
      const targetLanguage = 'ms';

      const translation = await languageService.translate(text, targetLanguage);

      expect(translation).toHaveProperty('text');
      expect(translation).toHaveProperty('language', targetLanguage);
      expect(translation).toHaveProperty('confidence');
      expect(translation.confidence).toBeGreaterThan(0);
    });

    test('should get supported languages', () => {
      const languages = languageService.getSupportedLanguages();

      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.some(lang => lang.code === 'ms')).toBe(true);
      expect(languages.some(lang => lang.code === 'en')).toBe(true);
    });

    test('should search medical terms', () => {
      const searchQuery = 'heart';
      const language = 'en';

      const results = languageService.searchMedicalTerms(searchQuery, language);

      expect(Array.isArray(results)).toBe(true);
      // Results depend on loaded terminology
    });

    test('should get cultural greetings', () => {
      const language = 'ms';
      
      const greetings = languageService.getCulturalGreetings(language);

      expect(greetings).toHaveProperty('hello');
      expect(typeof greetings.hello).toBe('string');
    });

    test('should get medical phrases', () => {
      const language = 'zh';
      
      const phrases = languageService.getMedicalPhrases(language);

      expect(phrases).toHaveProperty('doctor');
      expect(phrases).toHaveProperty('hospital');
    });

    test('should get emergency phrases in multiple languages', () => {
      const languages = ['ms', 'en', 'zh', 'ta'];
      
      const emergencyPhrases = languageService.getEmergencyPhrases(languages);

      expect(emergencyPhrases).toHaveProperty('call_ambulance');
      expect(emergencyPhrases).toHaveProperty('emergency_room');
      
      for (const phrase of Object.values(emergencyPhrases)) {
        languages.forEach(lang => {
          if (phrase[lang]) {
            expect(typeof phrase[lang]).toBe('string');
          }
        });
      }
    });

    test('should validate cultural sensitivity', () => {
      const sensitiveText = 'pork medication';
      const language = 'ms';

      const validation = languageService.validateCulturalSensitivity(sensitiveText, language);

      expect(validation).toHaveProperty('is_appropriate');
      expect(typeof validation.is_appropriate).toBe('boolean');
      if (!validation.is_appropriate) {
        expect(validation).toHaveProperty('concerns');
        expect(validation).toHaveProperty('suggestions');
      }
    });

    test('should check language support', () => {
      expect(languageService.isLanguageSupported('ms')).toBe(true);
      expect(languageService.isLanguageSupported('en')).toBe(true);
      expect(languageService.isLanguageSupported('xxx')).toBe(false);
    });
  });

  // ============================================================================
  // HALAL VALIDATION SERVICE TESTS
  // ============================================================================

  describe('Halal Validation Service', () => {
    test('should validate medication halal status', async () => {
      const medicationName = 'paracetamol';
      const manufacturer = 'GSK';

      const validation = await halalValidationService.validateMedication(medicationName, manufacturer);

      expect(validation).toHaveProperty('medication_name', medicationName);
      expect(validation).toHaveProperty('halal_status');
      expect(validation.halal_status).toHaveProperty('status');
      expect(['halal', 'haram', 'mashbooh', 'unknown']).toContain(validation.halal_status.status);
      expect(validation).toHaveProperty('reasoning');
      expect(Array.isArray(validation.reasoning)).toBe(true);
    });

    test('should validate individual ingredients', async () => {
      const ingredient = 'gelatin';

      const validation = await halalValidationService.validateIngredient(ingredient);

      expect(validation).toHaveProperty('name', ingredient);
      expect(validation).toHaveProperty('halal_status');
      expect(validation.halal_status).toHaveProperty('status');
      expect(validation.halal_status).toHaveProperty('confidence');
    });

    test('should validate medical treatment', async () => {
      const treatmentName = 'blood transfusion';
      const treatmentType = 'procedure';

      const validation = await halalValidationService.validateTreatment(treatmentName, treatmentType);

      expect(validation).toHaveProperty('treatment_name', treatmentName);
      expect(validation).toHaveProperty('treatment_type', treatmentType);
      expect(validation).toHaveProperty('halal_status');
      expect(validation).toHaveProperty('religious_considerations');
      expect(Array.isArray(validation.religious_considerations)).toBe(true);
    });

    test('should get halal alternatives', async () => {
      const medication = 'insulin';

      const alternatives = await halalValidationService.getHalalAlternatives(medication);

      expect(Array.isArray(alternatives)).toBe(true);
      if (alternatives && alternatives.length > 0) {
        alternatives.forEach(alt => {
          expect(alt).toHaveProperty('medication_name');
          expect(alt).toHaveProperty('halal_status');
        });
      }
    });

    test('should check manufacturer certification', async () => {
      const manufacturer = 'pfizer';

      const certification = await halalValidationService.checkManufacturerCertification(manufacturer);

      expect(certification).toHaveProperty('certified');
      expect(typeof certification.certified).toBe('boolean');
    });

    test('should validate Ramadan medication schedule', async () => {
      const medications = ['metformin', 'insulin'];
      const doseTimes = ['08:00', '14:00', '20:00'];

      const validation = await halalValidationService.validateRamadanSchedule(medications, doseTimes);

      expect(validation).toHaveProperty('ramadan_compatible');
      expect(validation).toHaveProperty('adjustments_needed');
      expect(validation).toHaveProperty('recommendations');
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });

    test('should get Islamic medical guidelines', () => {
      const guidelines = halalValidationService.getIslamicMedicalGuidelines();

      expect(guidelines).toHaveProperty('general_principles');
      expect(guidelines).toHaveProperty('emergency_exceptions');
      expect(guidelines).toHaveProperty('consultation_advice');
      expect(Array.isArray(guidelines.general_principles)).toBe(true);
    });
  });

  // ============================================================================
  // CULTURAL CALENDAR SERVICE TESTS
  // ============================================================================

  describe('Cultural Calendar Service', () => {
    test('should get Ramadan information', async () => {
      const year = 2024;

      const ramadanInfo = await culturalCalendarService.getRamadanInfo(year);

      expect(ramadanInfo).toHaveProperty('year', year);
      expect(ramadanInfo).toHaveProperty('start_date');
      expect(ramadanInfo).toHaveProperty('end_date');
      expect(ramadanInfo).toHaveProperty('duration_days');
      expect(ramadanInfo.start_date).toBeInstanceOf(Date);
      expect(ramadanInfo.end_date).toBeInstanceOf(Date);
    });

    test('should check if date is during Ramadan', async () => {
      const date = new Date('2024-03-15'); // Mock Ramadan period

      const ramadanStatus = await culturalCalendarService.isRamadan(date);

      expect(ramadanStatus).toHaveProperty('is_ramadan');
      expect(typeof ramadanStatus.is_ramadan).toBe('boolean');
    });

    test('should get cultural events for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const events = await culturalCalendarService.getCulturalEvents(startDate, endDate);

      expect(Array.isArray(events)).toBe(true);
      events.forEach(event => {
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('healthcare_impact');
      });
    });

    test('should get scheduling impact', async () => {
      const date = new Date('2024-08-31'); // National Day
      const region = 'KUL';

      const impact = await culturalCalendarService.getSchedulingImpact(date, region);

      expect(impact).toHaveProperty('date');
      expect(impact).toHaveProperty('scheduling_recommendations');
      expect(impact).toHaveProperty('patient_considerations');
      expect(Array.isArray(impact.patient_considerations)).toBe(true);
    });

    test('should get Hijri date', () => {
      const gregorianDate = new Date('2024-01-15');

      const hijriDate = culturalCalendarService.getHijriDate(gregorianDate);

      expect(hijriDate).toHaveProperty('hijri_year');
      expect(hijriDate).toHaveProperty('hijri_month');
      expect(hijriDate).toHaveProperty('hijri_day');
      expect(hijriDate).toHaveProperty('month_name');
      expect(hijriDate).toHaveProperty('gregorian_date', gregorianDate);
    });

    test('should get Ramadan-friendly appointment times', async () => {
      const date = new Date('2024-03-15'); // Mock Ramadan period
      const stateCode = 'SGR';

      const friendlyTimes = await culturalCalendarService.getRamadanFriendlyTimes(date, stateCode);

      expect(friendlyTimes).toHaveProperty('recommended_times');
      expect(friendlyTimes).toHaveProperty('avoid_times');
      expect(friendlyTimes).toHaveProperty('considerations');
      expect(Array.isArray(friendlyTimes.recommended_times)).toBe(true);
      expect(Array.isArray(friendlyTimes.avoid_times)).toBe(true);
    });

    test('should get cultural significance', async () => {
      const date = new Date('2024-12-25'); // Christmas

      const significance = await culturalCalendarService.getCulturalSignificance(date);

      expect(significance).toHaveProperty('has_significance');
      expect(significance).toHaveProperty('events');
      expect(significance).toHaveProperty('islamic_date');
      expect(significance).toHaveProperty('recommendations');
    });
  });

  // ============================================================================
  // DIETARY SERVICE TESTS
  // ============================================================================

  describe('Dietary Service', () => {
    test('should create patient dietary profile', async () => {
      const userId = 'test-user-123';
      const religion = 'Islam';
      const dietaryPreferences = ['halal_only'];
      const medicalNeeds = ['diabetes'];

      const profile = await dietaryService.createPatientProfile(
        userId,
        religion,
        dietaryPreferences,
        medicalNeeds
      );

      expect(profile).toHaveProperty('user_id', userId);
      expect(profile).toHaveProperty('religion', religion);
      expect(profile).toHaveProperty('dietary_preferences', dietaryPreferences);
      expect(profile).toHaveProperty('restrictions');
      expect(Array.isArray(profile.restrictions)).toBe(true);
    });

    test('should validate dietary item', async () => {
      const item = 'pork';
      const profile = await dietaryService.createPatientProfile('test', 'Islam', ['halal_only']);

      const validation = await dietaryService.validateDietaryItem(item, profile);

      expect(validation).toHaveProperty('is_suitable');
      expect(validation).toHaveProperty('concerns');
      expect(validation).toHaveProperty('alternatives');
      expect(validation).toHaveProperty('severity');
    });

    test('should get medication diet interaction', async () => {
      const medication = 'warfarin';
      const profile = await dietaryService.createPatientProfile('test', 'Islam', ['halal_only']);

      const interaction = await dietaryService.getMedicationDietInteraction(medication, profile);

      expect(interaction).toHaveProperty('medication_name', medication);
      expect(interaction).toHaveProperty('food_interactions');
      expect(interaction).toHaveProperty('dietary_timing_recommendations');
      expect(Array.isArray(interaction.food_interactions)).toBe(true);
    });

    test('should get Ramadan dietary guidance', async () => {
      const profile = await dietaryService.createPatientProfile('test', 'Islam', ['halal_only']);

      const guidance = await dietaryService.getRamadanDietaryGuidance(profile);

      expect(guidance).toHaveProperty('fasting_suitable');
      expect(guidance).toHaveProperty('nutritional_recommendations');
      expect(guidance).toHaveProperty('meal_timing_suggestions');
      expect(guidance).toHaveProperty('hydration_guidance');
      expect(Array.isArray(guidance.nutritional_recommendations)).toBe(true);
    });

    test('should get cultural meal suggestions', async () => {
      const profile = await dietaryService.createPatientProfile('test', 'Hinduism', ['vegetarian']);
      const mealType = 'lunch';

      const suggestions = await dietaryService.getCulturalMealSuggestions(profile, mealType);

      expect(suggestions).toHaveProperty('suitable_options');
      expect(suggestions).toHaveProperty('avoid_completely');
      expect(suggestions).toHaveProperty('preparation_notes');
      expect(suggestions).toHaveProperty('cultural_considerations');
    });

    test('should get dietary restrictions by religion', () => {
      const islamicRestrictions = dietaryService.getDietaryRestrictionsByReligion('Islam');

      expect(Array.isArray(islamicRestrictions)).toBe(true);
      expect(islamicRestrictions.every(r => r.religion === 'Islam')).toBe(true);
    });
  });

  // ============================================================================
  // CULTURAL PREFERENCE SERVICE TESTS
  // ============================================================================

  describe('Cultural Preference Service', () => {
    test('should create cultural profile', async () => {
      const profileData = {
        user_id: 'test-user-456',
        religion: 'Islam' as const,
        primary_language: 'ms',
        state_code: 'KUL'
      };

      const profile = await culturalPreferenceService.createCulturalProfile(profileData);

      expect(profile).toHaveProperty('user_id', profileData.user_id);
      expect(profile).toHaveProperty('religion', profileData.religion);
      expect(profile).toHaveProperty('primary_language', profileData.primary_language);
      expect(profile).toHaveProperty('state_code', profileData.state_code);
      expect(profile).toHaveProperty('created_at');
      expect(profile.created_at).toBeInstanceOf(Date);
    });

    test('should get integrated cultural guidance', async () => {
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'test-user-789',
        religion: 'Islam' as const,
        primary_language: 'ms',
        state_code: 'SGR',
        halal_requirements: true
      });

      const context = {
        medications: ['paracetamol'],
        appointment_date: new Date('2024-01-15')
      };

      const guidance = await culturalPreferenceService.getIntegratedCulturalGuidance(preferences, context);

      expect(guidance).toHaveProperty('language_support');
      expect(guidance).toHaveProperty('cultural_events');
      expect(guidance).toHaveProperty('healthcare_adjustments');
      expect(guidance.language_support).toHaveProperty('preferred_language', 'ms');
    });

    test('should perform cultural assessment', async () => {
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'test-user-101',
        religion: 'Hinduism' as const,
        primary_language: 'ta',
        state_code: 'KUL',
        vegetarian_preference: true
      });

      const assessment = await culturalPreferenceService.performCulturalAssessment(preferences);

      expect(assessment).toHaveProperty('user_id', preferences.user_id);
      expect(assessment).toHaveProperty('cultural_compatibility_score');
      expect(assessment).toHaveProperty('key_considerations');
      expect(assessment).toHaveProperty('recommendations');
      expect(assessment).toHaveProperty('assessment_date');
      expect(assessment.cultural_compatibility_score).toBeGreaterThanOrEqual(0);
      expect(assessment.cultural_compatibility_score).toBeLessThanOrEqual(100);
    });

    test('should validate healthcare plan', async () => {
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'test-user-202',
        religion: 'Islam' as const,
        primary_language: 'ms',
        state_code: 'JHR',
        halal_requirements: true
      });

      const healthcarePlan = {
        medications: ['insulin', 'metformin'],
        appointment_times: ['09:00', '14:00'],
        dietary_recommendations: ['rice', 'chicken'],
        treatment_procedures: ['blood_test']
      };

      const validation = await culturalPreferenceService.validateHealthcarePlan(preferences, healthcarePlan);

      expect(validation).toHaveProperty('overall_compatibility');
      expect(['high', 'medium', 'low']).toContain(validation.overall_compatibility);
      expect(validation).toHaveProperty('medication_issues');
      expect(validation).toHaveProperty('scheduling_conflicts');
      expect(validation).toHaveProperty('dietary_conflicts');
      expect(validation).toHaveProperty('cultural_recommendations');
    });

    test('should get service status', () => {
      const status = culturalPreferenceService.getServiceStatus();

      expect(status).toHaveProperty('cultural_preference');
      expect(status).toHaveProperty('prayer_time');
      expect(status).toHaveProperty('language');
      expect(status).toHaveProperty('halal_validation');
      expect(status).toHaveProperty('cultural_calendar');
      expect(status).toHaveProperty('dietary');

      // Check that all statuses are boolean
      Object.values(status).forEach(serviceStatus => {
        expect(typeof serviceStatus).toBe('boolean');
      });
    });

    test('should check initialization status', () => {
      expect(typeof culturalPreferenceService.isInitialized()).toBe('boolean');
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Cultural Services Integration', () => {
    test('should handle complex Malaysian patient scenario', async () => {
      // Create a comprehensive Malaysian patient profile
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'malaysian-patient-001',
        religion: 'Islam' as const,
        ethnicity: 'Malay',
        primary_language: 'ms',
        secondary_languages: ['en'],
        state_code: 'KUL',
        religious_observance_level: 'strict',
        halal_requirements: true,
        ramadan_fasting: true,
        prayer_time_notifications: true,
        cultural_interpreter_needed: false,
        family_involvement_level: 'high'
      });

      // Simulate healthcare context
      const healthcareContext = {
        medications: ['insulin', 'metformin'],
        appointment_date: new Date('2024-03-15'), // During mock Ramadan
        medical_conditions: ['diabetes type 2']
      };

      // Get integrated guidance
      const guidance = await culturalPreferenceService.getIntegratedCulturalGuidance(
        preferences, 
        healthcareContext
      );

      // Verify comprehensive cultural integration
      expect(guidance.language_support.preferred_language).toBe('ms');
      expect(guidance.healthcare_adjustments.length).toBeGreaterThan(0);
      
      // Check for Islam-specific considerations
      const islamicAdjustments = guidance.healthcare_adjustments.filter(
        adj => adj.cultural_context.toLowerCase().includes('islam') ||
               adj.cultural_context.toLowerCase().includes('halal') ||
               adj.cultural_context.toLowerCase().includes('prayer')
      );
      expect(islamicAdjustments.length).toBeGreaterThan(0);
    });

    test('should handle non-Muslim patient with dietary restrictions', async () => {
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'hindu-patient-001',
        religion: 'Hinduism' as const,
        ethnicity: 'Indian',
        primary_language: 'ta',
        secondary_languages: ['en', 'ms'],
        state_code: 'PNG',
        vegetarian_preference: true,
        cultural_interpreter_needed: true,
        family_involvement_level: 'high'
      });

      const guidance = await culturalPreferenceService.getIntegratedCulturalGuidance(preferences);

      // Should not include Islamic-specific features
      expect(guidance.prayer_info).toBeUndefined();
      expect(guidance.halal_validation).toBeUndefined();
      
      // Should include language support and general cultural considerations
      expect(guidance.language_support.preferred_language).toBe('ta');
      expect(guidance.healthcare_adjustments.some(
        adj => adj.category === 'communication' && adj.recommendation.includes('interpreter')
      )).toBe(true);
    });

    test('should handle emergency flexibility scenarios', async () => {
      // Strict observance with emergency flexibility
      const flexiblePreferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'emergency-flexible-001',
        religion: 'Islam' as const,
        religious_observance_level: 'strict',
        cultural_flexibility_in_emergencies: true,
        state_code: 'MLK'
      });

      // Strict observance without emergency flexibility
      const inflexiblePreferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'emergency-inflexible-001',
        religion: 'Islam' as const,
        religious_observance_level: 'strict',
        cultural_flexibility_in_emergencies: false,
        state_code: 'MLK'
      });

      const flexibleAssessment = await culturalPreferenceService.performCulturalAssessment(flexiblePreferences);
      const inflexibleAssessment = await culturalPreferenceService.performCulturalAssessment(inflexiblePreferences);

      // Flexible patient should have higher compatibility score
      expect(flexibleAssessment.cultural_compatibility_score)
        .toBeGreaterThan(inflexibleAssessment.cultural_compatibility_score);
      
      // Inflexible patient should require follow-up
      expect(inflexibleAssessment.follow_up_needed).toBe(true);
    });

    test('should coordinate services for medication timing during Ramadan', async () => {
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'ramadan-medication-001',
        religion: 'Islam' as const,
        state_code: 'KTN',
        ramadan_fasting: true,
        halal_requirements: true
      });

      const healthcarePlan = {
        medications: ['metformin', 'insulin'],
        appointment_times: ['12:00', '18:00'], // Problematic during fasting
        dietary_recommendations: ['complex carbohydrates'],
        treatment_procedures: ['blood glucose monitoring']
      };

      const validation = await culturalPreferenceService.validateHealthcarePlan(preferences, healthcarePlan);

      // Should identify scheduling conflicts during fasting hours
      expect(validation.scheduling_conflicts.length).toBeGreaterThan(0);
      
      // Should provide Ramadan-specific adjustments
      expect(validation.required_adjustments.some(
        adj => adj.toLowerCase().includes('ramadan') || 
               adj.toLowerCase().includes('fasting') ||
               adj.toLowerCase().includes('prayer')
      )).toBe(true);
    });

    test('should handle multi-language emergency scenarios', async () => {
      const preferences = await culturalPreferenceService.createCulturalProfile({
        user_id: 'multilingual-emergency-001',
        primary_language: 'zh',
        secondary_languages: ['ms', 'en'],
        cultural_interpreter_needed: true,
        state_code: 'SWK'
      });

      const emergencyContext = {
        emergency: true,
        medications: ['epinephrine'],
        appointment_date: new Date()
      };

      const guidance = await culturalPreferenceService.getIntegratedCulturalGuidance(
        preferences,
        emergencyContext
      );

      // Should prioritize communication support in emergencies
      const communicationAdjustments = guidance.healthcare_adjustments.filter(
        adj => adj.category === 'communication' && adj.priority === 'high'
      );
      expect(communicationAdjustments.length).toBeGreaterThan(0);

      // Should provide emergency phrases in multiple languages
      expect(guidance.language_support.available_translations).toContain('zh');
      expect(guidance.language_support.available_translations).toContain('ms');
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Tests', () => {
    test('prayer time queries should meet performance targets', async () => {
      const stateCode = 'KUL';
      const startTime = Date.now();

      await prayerTimeService.getPrayerTimes(stateCode);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Sub-50ms target
    });

    test('halal validation should meet performance targets', async () => {
      const medicationName = 'paracetamol';
      const startTime = Date.now();

      await halalValidationService.validateMedication(medicationName);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Sub-100ms target
    });

    test('language translation should meet performance targets', async () => {
      const text = 'emergency';
      const targetLanguage = 'ms';
      const startTime = Date.now();

      await languageService.translate(text, targetLanguage);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200); // Sub-200ms target
    });

    test('cultural calendar lookups should meet performance targets', async () => {
      const date = new Date();
      const startTime = Date.now();

      await culturalCalendarService.getSchedulingImpact(date);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Sub-100ms target
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    test('should gracefully handle network failures', async () => {
      // Mock network failure scenario
      const stateCode = 'KUL';
      
      // Should fallback to calculated times when API fails
      const prayerTimes = await prayerTimeService.getPrayerTimes(stateCode);
      expect(['jakim', 'calculated', 'cached']).toContain(prayerTimes.source);
    });

    test('should handle invalid cultural preferences gracefully', async () => {
      const invalidPreferences = {
        user_id: 'invalid-test',
        religion: 'InvalidReligion' as any,
        primary_language: 'invalid',
        state_code: 'XXX'
      };

      // Should create profile with defaults for invalid values
      const profile = await culturalPreferenceService.createCulturalProfile(invalidPreferences);
      expect(profile.user_id).toBe('invalid-test');
      // Should handle invalid values gracefully
    });

    test('should handle service initialization failures', () => {
      // Services should handle partial initialization gracefully
      const status = culturalPreferenceService.getServiceStatus();
      expect(typeof status).toBe('object');
    });
  });
});