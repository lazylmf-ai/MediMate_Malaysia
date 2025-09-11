# Multi-Language Support - Building Inclusive Healthcare Applications

## Introduction

Malaysia's diverse population speaks multiple languages, making multi-language support essential for healthcare applications. This guide shows you how to build healthcare systems that communicate effectively in Bahasa Malaysia, English, Chinese (Mandarin), and Tamil while maintaining medical accuracy and cultural sensitivity.

## Malaysian Language Landscape in Healthcare

### Primary Healthcare Languages

1. **Bahasa Malaysia (Malay)** - National language, government healthcare
2. **English** - Medical terminology, international standards
3. **Chinese (Mandarin/Simplified)** - Large Chinese-Malaysian population
4. **Tamil** - Indian-Malaysian community healthcare needs

### Regional Variations

Different Malaysian states have varying language preferences:

```javascript
import { MediMateMalaysia, SupportedLanguage } from '@medimate/malaysia-sdk';

const client = new MediMateMalaysia({
  apiKey: 'mk_live_your_key_here',
  culturalContext: {
    malaysianState: 'PEN',
    preferredLanguage: SupportedLanguage.CHINESE,
    fallbackLanguages: [SupportedLanguage.ENGLISH, SupportedLanguage.MALAY]
  }
});

// Get language preferences by state
const languageStats = await client.cultural.getLanguagePreferences('PEN');
console.log('Penang Language Distribution:');
console.log(`Chinese: ${languageStats.data.chinese_percentage}%`);
console.log(`Malay: ${languageStats.data.malay_percentage}%`);
console.log(`English: ${languageStats.data.english_percentage}%`);
console.log(`Tamil: ${languageStats.data.tamil_percentage}%`);
```

## Medical Translation Services

### Medical Terminology Translation

Medical terms require specialized translation to maintain accuracy:

```python
from medimate_malaysia import MediMateMalaysia
from medimate_malaysia.models import TranslationRequest, MedicalDomain
import asyncio

async def translate_medical_content(content: str, target_language: str, domain: str):
    async with MediMateMalaysia(api_key="mk_live_your_key") as client:
        # Medical translation with context
        translation = await client.cultural.translate_medical_content_async(
            text=content,
            source_language='en',
            target_language=target_language,
            medical_domain=domain,  # 'cardiology', 'pediatrics', 'pharmacy', etc.
            maintain_medical_accuracy=True,
            include_transliteration=True  # For Malay/Chinese names
        )
        
        return {
            'original': content,
            'translated': translation.translated_text,
            'medical_terms': translation.medical_terminology_used,
            'confidence_score': translation.confidence_score,
            'transliteration': translation.transliteration,
            'cultural_notes': translation.cultural_considerations
        }

# Example: Translate prescription instructions
prescription_instructions = """
Take 1 tablet twice daily with food.
Do not exceed recommended dosage.
Complete the full course even if symptoms improve.
Contact your doctor if you experience side effects.
"""

# Translate to Malay
malay_translation = await translate_medical_content(
    prescription_instructions, 
    'ms', 
    'pharmacy'
)

print("Malay Translation:")
print(malay_translation['translated'])
print("\nMedical Terms Used:")
for term in malay_translation['medical_terms']:
    print(f"  {term['english']} -> {term['malay']}")
```

### Multi-Language Patient Communication

```java
import my.medimate.malaysia.sdk.client.MediMateMalaysiaClient;
import my.medimate.malaysia.sdk.model.*;
import java.util.*;

public class MultiLanguagePatientCommunication {
    private final MediMateMalaysiaClient client;
    
    public PatientCommunicationPackage createMultiLanguagePackage(
            String patientId,
            String primaryContent,
            List<String> targetLanguages) {
            
        try {
            PatientProfile patient = client.getPatients().getProfile(patientId);
            String primaryLanguage = patient.getCulturalPreferences().getPreferredLanguage();
            
            Map<String, TranslatedContent> translations = new HashMap<>();
            
            // Translate content to all target languages
            for (String language : targetLanguages) {
                if (!language.equals(primaryLanguage)) {
                    TranslationRequest request = TranslationRequest.builder()
                        .sourceText(primaryContent)
                        .sourceLanguage(primaryLanguage)
                        .targetLanguage(language)
                        .contentType("patient_communication")
                        .patientContext(patient.getCulturalPreferences())
                        .medicalDomain(determineMedicalDomain(primaryContent))
                        .urgencyLevel("standard")
                        .build();
                        
                    TranslationResponse response = client.getCultural()
                        .translateMedicalContent(request);
                        
                    translations.put(language, TranslatedContent.builder()
                        .language(language)
                        .translatedText(response.getTranslatedText())
                        .confidence(response.getConfidenceScore())
                        .medicalTerminology(response.getMedicalTermsUsed())
                        .culturalAdaptations(response.getCulturalAdaptations())
                        .readabilityScore(response.getReadabilityScore())
                        .build());
                }
            }
            
            // Generate audio versions for accessibility
            Map<String, AudioContent> audioVersions = generateAudioVersions(translations);
            
            // Create visual aids with cultural context
            Map<String, VisualAid> visualAids = generateCulturallyAppropriateVisuals(
                translations, 
                patient.getCulturalPreferences());
            
            return PatientCommunicationPackage.builder()
                .patientId(patientId)
                .primaryLanguage(primaryLanguage)
                .originalContent(primaryContent)
                .translations(translations)
                .audioVersions(audioVersions)
                .visualAids(visualAids)
                .culturalConsiderations(extractCulturalConsiderations(patient))
                .accessibilityFeatures(generateAccessibilityFeatures(translations))
                .build();
                
        } catch (MediMateException e) {
            logger.error("Failed to create multi-language package: {}", e.getMessage());
            throw new CommunicationException(e);
        }
    }
    
    private Map<String, AudioContent> generateAudioVersions(
            Map<String, TranslatedContent> translations) {
            
        Map<String, AudioContent> audioVersions = new HashMap<>();
        
        for (Map.Entry<String, TranslatedContent> entry : translations.entrySet()) {
            String language = entry.getKey();
            String text = entry.getValue().getTranslatedText();
            
            // Generate audio with appropriate voice and pronunciation
            AudioRequest audioRequest = AudioRequest.builder()
                .text(text)
                .language(language)
                .voiceType(getAppropriateVoiceType(language))
                .speed("normal")
                .medicalPronunciation(true)
                .build();
                
            AudioResponse audioResponse = client.getAudio().generateSpeech(audioRequest);
            
            audioVersions.put(language, AudioContent.builder()
                .language(language)
                .audioUrl(audioResponse.getAudioUrl())
                .duration(audioResponse.getDuration())
                .voiceType(audioResponse.getVoiceType())
                .pronunciation(audioResponse.getPronunciationGuide())
                .build());
        }
        
        return audioVersions;
    }
}
```

### Real-time Language Detection and Translation

```csharp
using MediMate.Malaysia.SDK.Models;
using MediMate.Malaysia.SDK.Services;

public class RealTimeLanguageService
{
    private readonly IMediMateMalaysiaClient _client;
    
    public async Task<LanguageDetectionResult> DetectPatientLanguageAsync(
        string patientInput,
        string patientId = null)
    {
        // Analyze input to detect language
        var detection = await _client.Cultural.DetectLanguageAsync(new LanguageDetectionRequest
        {
            Text = patientInput,
            PatientId = patientId,
            Context = "healthcare_communication",
            IncludeConfidenceScore = true,
            DetectDialects = true
        });
        
        // Get patient language preferences if available
        PatientLanguagePreferences preferences = null;
        if (!string.IsNullOrEmpty(patientId))
        {
            var patient = await _client.Patients.GetProfileAsync(patientId);
            preferences = patient.LanguagePreferences;
        }
        
        return new LanguageDetectionResult
        {
            DetectedLanguage = detection.PrimaryLanguage,
            Confidence = detection.ConfidenceScore,
            AlternativeLanguages = detection.AlternativeLanguages,
            Dialect = detection.DetectedDialect,
            PatientPreferences = preferences,
            RecommendedResponse = await DetermineResponseLanguageAsync(
                detection, 
                preferences)
        };
    }
    
    public async Task<RealTimeTranslationResult> TranslateConversationAsync(
        ConversationContext conversation)
    {
        var translations = new List<MessageTranslation>();
        
        foreach (var message in conversation.Messages)
        {
            // Detect language if not specified
            if (string.IsNullOrEmpty(message.Language))
            {
                var detection = await DetectPatientLanguageAsync(
                    message.Text, 
                    conversation.PatientId);
                message.Language = detection.DetectedLanguage;
            }
            
            // Translate to target language(s)
            var targetLanguages = DetermineTargetLanguages(
                message.Language, 
                conversation.RequiredLanguages,
                conversation.PatientPreferences);
            
            var messageTranslations = new Dictionary<string, string>();
            
            foreach (var targetLang in targetLanguages)
            {
                if (targetLang != message.Language)
                {
                    var translation = await _client.Cultural.TranslateTextAsync(
                        new TranslationRequest
                        {
                            Text = message.Text,
                            SourceLanguage = message.Language,
                            TargetLanguage = targetLang,
                            Context = "healthcare_conversation",
                            PreserveMedicalTerms = true,
                            PatientCulturalContext = conversation.CulturalContext
                        });
                    
                    messageTranslations[targetLang] = translation.TranslatedText;
                }
            }
            
            translations.Add(new MessageTranslation
            {
                OriginalMessage = message,
                Translations = messageTranslations,
                MedicalTermsPreserved = ExtractPreservedMedicalTerms(messageTranslations),
                CulturalAdaptations = GetCulturalAdaptations(messageTranslations)
            });
        }
        
        return new RealTimeTranslationResult
        {
            ConversationId = conversation.Id,
            MessageTranslations = translations,
            OverallAccuracy = CalculateOverallAccuracy(translations),
            CulturalConsiderations = ExtractCulturalConsiderations(translations),
            RecommendedFollowUp = GenerateFollowUpRecommendations(translations)
        };
    }
    
    private async Task<string> DetermineResponseLanguageAsync(
        LanguageDetectionResponse detection,
        PatientLanguagePreferences preferences)
    {
        // Prioritize patient's stated preference
        if (preferences?.PreferredLanguage != null)
        {
            return preferences.PreferredLanguage;
        }
        
        // Use detected language if confidence is high
        if (detection.ConfidenceScore > 0.8)
        {
            return detection.PrimaryLanguage;
        }
        
        // Fall back to English for medical safety
        return "en";
    }
}
```

## Cultural Adaptation in Translation

### Context-Aware Medical Translation

```javascript
// Advanced medical translation with cultural context
class CulturalMedicalTranslator {
  constructor(client) {
    this.client = client;
  }
  
  async translateWithCulturalContext(content, targetLanguage, culturalContext) {
    // Analyze content for cultural sensitivity requirements
    const culturalAnalysis = await this.client.cultural.analyzeCulturalSensitivity({
      content: content,
      target_language: targetLanguage,
      cultural_background: culturalContext.cultural_background,
      religious_considerations: culturalContext.religious_considerations
    });
    
    // Perform base translation
    const baseTranslation = await this.client.cultural.translateMedicalContent({
      text: content,
      target_language: targetLanguage,
      medical_domain: culturalContext.medical_domain,
      preserve_medical_accuracy: true
    });
    
    // Apply cultural adaptations
    const culturalAdaptations = await this.applyCulturalAdaptations(
      baseTranslation.data.translated_text,
      targetLanguage,
      culturalAnalysis.data.adaptations_needed
    );
    
    return {
      original_text: content,
      base_translation: baseTranslation.data.translated_text,
      culturally_adapted: culturalAdaptations.adapted_text,
      cultural_changes: culturalAdaptations.changes_made,
      medical_terms_preserved: baseTranslation.data.medical_terminology,
      cultural_notes: culturalAnalysis.data.cultural_notes,
      appropriateness_score: culturalAdaptations.appropriateness_score
    };
  }
  
  async applyCulturalAdaptations(text, language, adaptations) {
    const changes = [];
    let adaptedText = text;
    
    for (const adaptation of adaptations) {
      switch (adaptation.type) {
        case 'religious_sensitivity':
          // Adapt language for religious considerations
          const religiousAdaptation = await this.client.cultural.adaptForReligiousSensitivity({
            text: adaptedText,
            language: language,
            religion: adaptation.religion,
            sensitivity_level: adaptation.level
          });
          adaptedText = religiousAdaptation.data.adapted_text;
          changes.push({
            type: 'religious_adaptation',
            original: text,
            adapted: adaptedText,
            reason: religiousAdaptation.data.reason
          });
          break;
          
        case 'gender_appropriateness':
          // Adapt for gender-specific medical discussions
          const genderAdaptation = await this.client.cultural.adaptForGenderAppropriate({
            text: adaptedText,
            language: language,
            patient_gender: adaptation.patient_gender,
            topic_sensitivity: adaptation.sensitivity_level
          });
          adaptedText = genderAdaptation.data.adapted_text;
          changes.push({
            type: 'gender_adaptation',
            changes: genderAdaptation.data.changes_made
          });
          break;
          
        case 'age_appropriateness':
          // Adapt language complexity for patient age
          const ageAdaptation = await this.client.cultural.adaptForAgeGroup({
            text: adaptedText,
            language: language,
            patient_age_group: adaptation.age_group,
            simplify_medical_terms: adaptation.simplify
          });
          adaptedText = ageAdaptation.data.adapted_text;
          changes.push({
            type: 'age_adaptation',
            simplifications: ageAdaptation.data.simplifications_made
          });
          break;
          
        case 'cultural_metaphors':
          // Use culturally relevant analogies and metaphors
          const metaphorAdaptation = await this.client.cultural.adaptMetaphors({
            text: adaptedText,
            language: language,
            cultural_background: adaptation.cultural_background
          });
          adaptedText = metaphorAdaptation.data.adapted_text;
          changes.push({
            type: 'metaphor_adaptation',
            metaphors_used: metaphorAdaptation.data.metaphors_applied
          });
          break;
      }
    }
    
    return {
      adapted_text: adaptedText,
      changes_made: changes,
      appropriateness_score: await this.calculateAppropriatenessScore(adaptedText, language)
    };
  }
  
  // Specialized medical communication patterns for Malaysian languages
  async generateMalaysianMedicalCommunication(medicalInfo, patientProfile) {
    const language = patientProfile.preferred_language;
    const culturalBackground = patientProfile.cultural_background;
    
    const communicationPatterns = {
      'ms': {
        greeting: this.getMalayMedicalGreeting(patientProfile),
        instruction_style: 'respectful_directive',
        family_involvement: 'encouraged',
        religious_considerations: 'prayer_time_aware'
      },
      'zh': {
        greeting: this.getChineseMedicalGreeting(patientProfile),
        instruction_style: 'detailed_explanation',
        family_involvement: 'hierarchical_respect',
        traditional_medicine: 'acknowledge_tcm'
      },
      'ta': {
        greeting: this.getTamilMedicalGreeting(patientProfile),
        instruction_style: 'respectful_detailed',
        family_involvement: 'elder_respect',
        cultural_beliefs: 'ayurvedic_awareness'
      }
    };
    
    const pattern = communicationPatterns[language] || communicationPatterns['en'];
    
    return await this.client.cultural.generateCulturalMedicalCommunication({
      medical_information: medicalInfo,
      communication_pattern: pattern,
      patient_profile: patientProfile,
      language: language
    });
  }
}
```

## Language-Specific User Interface

### Multi-Language Frontend Components

```python
# React component generation for multi-language healthcare UI
from typing import Dict, List
import json

class MultiLanguageUIGenerator:
    def __init__(self, client: MediMateMalaysia):
        self.client = client
        
    async def generate_language_switcher(self, available_languages: List[str], current_language: str):
        """Generate a culturally appropriate language switcher component"""
        
        language_display_names = {}
        language_flags = {}
        rtl_languages = []
        
        for lang_code in available_languages:
            # Get native language name and display preferences
            lang_info = await self.client.cultural.get_language_info_async(lang_code)
            
            language_display_names[lang_code] = {
                'native_name': lang_info.native_name,
                'english_name': lang_info.english_name,
                'local_name': lang_info.local_name_in_malaysia
            }
            
            language_flags[lang_code] = lang_info.flag_icon
            
            if lang_info.text_direction == 'rtl':
                rtl_languages.append(lang_code)
        
        # Generate React component code
        component_code = f"""
import React, {{ useState, useEffect }} from 'react';
import {{ useTranslation }} from 'react-i18next';
import {{ Select, MenuItem, FormControl, InputLabel, Box, Typography }} from '@mui/material';

const LanguageSwitcher = ({{ currentLanguage, onLanguageChange }}) => {{
    const {{ t, i18n }} = useTranslation();
    
    const languages = {json.dumps(language_display_names, indent=8)};
    
    const flags = {json.dumps(language_flags, indent=8)};
    
    const rtlLanguages = {json.dumps(rtl_languages)};
    
    const handleLanguageChange = async (event) => {{
        const newLanguage = event.target.value;
        
        // Update text direction for RTL languages
        document.dir = rtlLanguages.includes(newLanguage) ? 'rtl' : 'ltr';
        
        // Change language
        await i18n.changeLanguage(newLanguage);
        onLanguageChange(newLanguage);
        
        // Update medical terminology cache
        await updateMedicalTerminologyCache(newLanguage);
    }};
    
    const updateMedicalTerminologyCache = async (language) => {{
        // Pre-load medical terms for the selected language
        const medicalTerms = await fetch(`/api/medical-terms/${{language}}`);
        const terms = await medicalTerms.json();
        localStorage.setItem(`medical-terms-${{language}}`, JSON.stringify(terms));
    }};
    
    return (
        <FormControl sx={{{{ minWidth: 200 }}}}>
            <InputLabel>{{t('select_language')}}</InputLabel>
            <Select
                value={{currentLanguage}}
                onChange={{handleLanguageChange}}
                label={{t('select_language')}}
            >
                {{Object.entries(languages).map(([code, names]) => (
                    <MenuItem key={{code}} value={{code}}>
                        <Box sx={{{{ display: 'flex', alignItems: 'center', gap: 1 }}}}>
                            <span>{{flags[code]}}</span>
                            <Typography>
                                {{names.native_name}}
                                {{names.local_name_in_malaysia && (
                                    <span style={{{{ fontSize: '0.8em', color: 'gray', marginLeft: 4 }}}}>
                                        ({{names.local_name_in_malaysia}})
                                    </span>
                                )}}
                            </Typography>
                        </Box>
                    </MenuItem>
                ))}}
            </Select>
        </FormControl>
    );
}};

export default LanguageSwitcher;
"""
        
        return component_code
    
    async def generate_medical_form_translations(
        self, 
        form_fields: Dict, 
        target_languages: List[str]
    ):
        """Generate translated medical form fields with cultural adaptations"""
        
        translated_forms = {}
        
        for language in target_languages:
            form_translation = {}
            
            for field_id, field_data in form_fields.items():
                # Translate field labels and help text
                field_translation = await self.client.cultural.translate_form_field_async(
                    field_data=field_data,
                    target_language=language,
                    form_context='medical_intake'
                )
                
                # Add validation messages in target language
                validation_messages = await self.client.cultural.translate_validation_messages_async(
                    field_type=field_data['type'],
                    target_language=language
                )
                
                # Cultural adaptations for sensitive fields
                cultural_adaptations = {}
                if field_data.get('culturally_sensitive'):
                    cultural_adaptations = await self.client.cultural.adapt_sensitive_field_async(
                        field_data=field_data,
                        target_language=language,
                        cultural_context='malaysian_healthcare'
                    )
                
                form_translation[field_id] = {
                    'label': field_translation.translated_label,
                    'placeholder': field_translation.translated_placeholder,
                    'help_text': field_translation.translated_help_text,
                    'validation_messages': validation_messages.messages,
                    'cultural_adaptations': cultural_adaptations,
                    'input_format': field_translation.recommended_input_format
                }
            
            translated_forms[language] = form_translation
        
        return translated_forms
    
    async def generate_appointment_scheduling_translations(self, target_languages: List[str]):
        """Generate culturally appropriate appointment scheduling interfaces"""
        
        scheduling_translations = {}
        
        for language in target_languages:
            # Get cultural time preferences
            time_preferences = await self.client.cultural.get_time_preferences_async(language)
            
            # Get prayer time considerations for Muslim patients
            prayer_considerations = await self.client.cultural.get_prayer_scheduling_text_async(language)
            
            # Generate date/time picker labels
            datetime_labels = await self.client.cultural.translate_datetime_interface_async(
                target_language=language,
                include_cultural_context=True
            )
            
            scheduling_translations[language] = {
                'time_preferences': time_preferences,
                'prayer_considerations': prayer_considerations,
                'datetime_labels': datetime_labels.labels,
                'cultural_notes': datetime_labels.cultural_notes,
                'recommended_time_format': time_preferences.preferred_time_format,
                'weekend_definitions': time_preferences.weekend_days
            }
        
        return scheduling_translations
```

## Voice and Speech Integration

### Multi-Language Voice Services

```java
public class MultiLanguageVoiceService {
    private final MediMateMalaysiaClient client;
    
    public VoiceServiceConfiguration setupVoiceServices(
            List<String> supportedLanguages,
            PatientDemographics patientDemo) {
            
        Map<String, VoiceConfiguration> voiceConfigs = new HashMap<>();
        
        for (String language : supportedLanguages) {
            VoiceConfiguration config = VoiceConfiguration.builder()
                .language(language)
                .voiceType(getOptimalVoiceType(language, patientDemo))
                .speechRate(getOptimalSpeechRate(language, patientDemo))
                .medicalPronunciation(true)
                .culturalAccent(getCulturalAccent(language, patientDemo.getRegion()))
                .build();
                
            voiceConfigs.put(language, config);
        }
        
        return VoiceServiceConfiguration.builder()
            .voiceConfigurations(voiceConfigs)
            .fallbackLanguage("en")
            .automaticLanguageDetection(true)
            .medicalTerminologyDatabase(loadMedicalTerminologyDatabase())
            .culturalPronunciationGuides(loadCulturalPronunciationGuides())
            .build();
    }
    
    public SpeechToTextResult processMultiLanguageSpeech(
            byte[] audioData,
            List<String> possibleLanguages,
            String medicalContext) {
            
        try {
            // First, detect the language
            LanguageDetectionResult detection = client.getAudio()
                .detectSpokenLanguage(audioData, possibleLanguages);
                
            // Process speech with detected language
            SpeechToTextRequest request = SpeechToTextRequest.builder()
                .audioData(audioData)
                .language(detection.getDetectedLanguage())
                .medicalContext(medicalContext)
                .enhanceMedicalTerms(true)
                .includeConfidenceScores(true)
                .culturalPronunciationVariants(true)
                .build();
                
            SpeechToTextResponse response = client.getAudio().speechToText(request);
            
            // Validate medical terminology
            MedicalTerminologyValidation termValidation = 
                validateMedicalTerminology(response.getTranscript(), detection.getDetectedLanguage());
            
            return SpeechToTextResult.builder()
                .transcript(response.getTranscript())
                .detectedLanguage(detection.getDetectedLanguage())
                .confidence(response.getConfidence())
                .medicalTermsIdentified(termValidation.getIdentifiedTerms())
                .suggestedCorrections(termValidation.getSuggestedCorrections())
                .culturalContext(extractCulturalContext(response.getTranscript()))
                .build();
                
        } catch (MediMateException e) {
            logger.error("Multi-language speech processing failed: {}", e.getMessage());
            throw new VoiceProcessingException(e);
        }
    }
    
    private String getOptimalVoiceType(String language, PatientDemographics demographics) {
        // Select appropriate voice based on patient demographics and cultural preferences
        Map<String, String> voiceSelectionRules = Map.of(
            "ms", getAppropriateVoiceForMalay(demographics),
            "zh", getAppropriateVoiceForChinese(demographics),
            "ta", getAppropriateVoiceForTamil(demographics),
            "en", getAppropriateVoiceForEnglish(demographics)
        );
        
        return voiceSelectionRules.getOrDefault(language, "neutral_professional");
    }
    
    private String getAppropriateVoiceForMalay(PatientDemographics demographics) {
        // Consider regional variations in Malay pronunciation
        if (demographics.getState().equals("KDH") || demographics.getState().equals("PER")) {
            return "northern_malay_accent";
        } else if (demographics.getState().equals("JHR")) {
            return "southern_malay_accent";
        } else if (demographics.getState().equals("KTN") || demographics.getState().equals("TRG")) {
            return "east_coast_malay_accent";
        }
        return "standard_malay";
    }
}
```

## Document Translation and Localization

### Medical Document Translation

```csharp
public class MedicalDocumentTranslationService
{
    private readonly IMediMateMalaysiaClient _client;
    
    public async Task<TranslatedMedicalDocument> TranslateMedicalDocumentAsync(
        string documentId,
        string targetLanguage,
        DocumentTranslationOptions options = null)
    {
        var document = await _client.Documents.GetAsync(documentId);
        options ??= new DocumentTranslationOptions();
        
        // Extract document content and structure
        var documentAnalysis = await _client.Documents.AnalyzeStructureAsync(documentId);
        
        var translatedSections = new List<TranslatedSection>();
        
        foreach (var section in documentAnalysis.Sections)
        {
            var sectionTranslation = await TranslateSectionAsync(
                section, 
                targetLanguage, 
                options);
                
            translatedSections.Add(sectionTranslation);
        }
        
        // Maintain document formatting and medical accuracy
        var formattedDocument = await _client.Documents.FormatTranslatedDocumentAsync(
            new DocumentFormattingRequest
            {
                OriginalDocument = document,
                TranslatedSections = translatedSections,
                TargetLanguage = targetLanguage,
                PreserveFormatting = options.PreserveOriginalFormatting,
                MedicalComplianceCheck = options.EnsureMedicalCompliance
            });
        
        // Generate cultural adaptation notes
        var culturalNotes = await GenerateCulturalAdaptationNotesAsync(
            document, 
            targetLanguage,
            translatedSections);
        
        return new TranslatedMedicalDocument
        {
            OriginalDocumentId = documentId,
            TargetLanguage = targetLanguage,
            TranslatedContent = formattedDocument.Content,
            TranslatedSections = translatedSections,
            CulturalAdaptationNotes = culturalNotes,
            MedicalAccuracyScore = formattedDocument.AccuracyScore,
            TranslationQuality = await AssessTranslationQualityAsync(
                document.Content, 
                formattedDocument.Content,
                targetLanguage),
            RecommendedReviews = GenerateReviewRecommendations(
                translatedSections,
                targetLanguage)
        };
    }
    
    private async Task<TranslatedSection> TranslateSectionAsync(
        DocumentSection section,
        string targetLanguage,
        DocumentTranslationOptions options)
    {
        var sectionType = ClassifySectionType(section);
        
        var translationRequest = new SectionTranslationRequest
        {
            Content = section.Content,
            SectionType = sectionType,
            SourceLanguage = section.DetectedLanguage,
            TargetLanguage = targetLanguage,
            MedicalDomain = section.MedicalDomain,
            PreserveMedicalTerms = options.PreserveMedicalTerminology,
            CulturalAdaptation = options.ApplyCulturalAdaptations,
            PatientContext = options.PatientCulturalContext
        };
        
        var translation = await _client.Cultural.TranslateMedicalSectionAsync(translationRequest);
        
        // Special handling for different section types
        switch (sectionType)
        {
            case SectionType.Prescription:
                translation = await AdaptPrescriptionInstructionsAsync(
                    translation, 
                    targetLanguage,
                    options.PatientCulturalContext);
                break;
                
            case SectionType.Diagnosis:
                translation = await AdaptDiagnosisExplanationAsync(
                    translation, 
                    targetLanguage,
                    options.PatientEducationLevel);
                break;
                
            case SectionType.TreatmentPlan:
                translation = await AdaptTreatmentInstructionsAsync(
                    translation, 
                    targetLanguage,
                    options.PatientCulturalContext);
                break;
                
            case SectionType.ConsentForm:
                translation = await AdaptConsentLanguageAsync(
                    translation, 
                    targetLanguage,
                    options.LegalRequirements);
                break;
        }
        
        return new TranslatedSection
        {
            OriginalSection = section,
            TranslatedContent = translation.TranslatedText,
            SectionType = sectionType,
            MedicalTermsPreserved = translation.PreservedMedicalTerms,
            CulturalAdaptations = translation.CulturalAdaptations,
            QualityScore = translation.QualityScore,
            ReviewRequired = DetermineIfReviewRequired(translation, sectionType)
        };
    }
    
    private async Task<CulturalAdaptationNotes> GenerateCulturalAdaptationNotesAsync(
        MedicalDocument originalDocument,
        string targetLanguage,
        List<TranslatedSection> translatedSections)
    {
        var adaptationAnalysis = await _client.Cultural.AnalyzeCulturalAdaptationsAsync(
            new CulturalAnalysisRequest
            {
                OriginalContent = originalDocument.Content,
                TranslatedSections = translatedSections,
                TargetLanguage = targetLanguage,
                CulturalContext = "malaysian_healthcare"
            });
        
        return new CulturalAdaptationNotes
        {
            LanguageSpecificConsiderations = adaptationAnalysis.LanguageConsiderations,
            CulturalSensitivityAdjustments = adaptationAnalysis.SensitivityAdjustments,
            ReligiousConsiderations = adaptationAnalysis.ReligiousConsiderations,
            MedicalConceptAdaptations = adaptationAnalysis.ConceptAdaptations,
            RecommendedSupplementaryMaterials = adaptationAnalysis.SupplementaryMaterials,
            PatientEducationNotes = adaptationAnalysis.EducationNotes
        };
    }
}
```

## Best Practices for Multi-Language Healthcare

### Language Quality Assurance

1. **Medical Terminology Consistency**:
   - Maintain glossaries of medical terms in all supported languages
   - Use standardized Malaysian medical terminology where available
   - Validate translations with medical professionals

2. **Cultural Sensitivity**:
   - Adapt content for religious and cultural contexts
   - Use appropriate formality levels for different languages
   - Consider gender-specific language requirements

3. **Technical Implementation**:
   - Implement proper Unicode support for all character sets
   - Support right-to-left text where applicable
   - Maintain consistent user experience across languages

4. **Quality Control**:
   - Regular review by native speaker medical professionals
   - Automated consistency checks for medical terminology
   - Patient feedback integration for continuous improvement

### Implementation Checklist

- [ ] Language detection and selection
- [ ] Medical terminology translation databases
- [ ] Cultural adaptation algorithms  
- [ ] Multi-language UI components
- [ ] Voice services for all supported languages
- [ ] Document translation workflows
- [ ] Quality assurance processes
- [ ] Patient feedback systems
- [ ] Staff training for multi-language support
- [ ] Regular content updates and maintenance

## Next Steps

1. **[PDPA Compliance](./06-pdpa-compliance.md)** - Ensure data protection compliance

## Resources

- [Dewan Bahasa dan Pustaka](https://www.dbp.gov.my) - Bahasa Malaysia standards
- [Malaysian Medical Council](https://www.mmc.gov.my) - Medical terminology guidelines  
- [Malaysian Chinese Medical Association](https://www.mcma.org.my) - Chinese medical terms
- [Malaysian Indian Medical Association](https://www.mima.org.my) - Tamil medical terminology

---

**Effective multi-language support ensures all Malaysians can access healthcare information in their preferred language while maintaining medical accuracy and cultural sensitivity. This inclusive approach improves patient outcomes and satisfaction across diverse communities.**