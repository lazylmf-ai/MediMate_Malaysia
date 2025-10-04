/**
 * Content Editor Screen
 *
 * WYSIWYG editor for creating and editing educational content.
 * Features:
 * - Multi-language support (ms, en, zh, ta)
 * - Auto-save every 30 seconds
 * - Draft, review, and publish workflow
 * - Rich text editing with formatting
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { LanguageTabBar, Language, TranslationStatus } from '@/components/admin/LanguageTabBar';
import { ContentMetadataForm, ContentType, DifficultyLevel } from '@/components/admin/ContentMetadataForm';
import {
  adminService,
  EducationContent,
  ContentStatus,
  CreateContentRequest,
  UpdateContentRequest,
  MultiLanguageText,
  ContentMetadata,
  TranslationStatusMap
} from '@/services/adminService';

interface ContentEditorScreenProps {
  route: {
    params?: {
      contentId?: string;
    };
  };
  navigation: any;
}

export const ContentEditorScreen: React.FC<ContentEditorScreenProps> = ({
  route,
  navigation
}) => {
  const contentId = route.params?.contentId;
  const isEdit = !!contentId;

  // State
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Content state
  const [type, setType] = useState<ContentType>('article');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState<Partial<MultiLanguageText>>({
    ms: '', en: '', zh: '', ta: ''
  });
  const [description, setDescription] = useState<Partial<MultiLanguageText>>({
    ms: '', en: '', zh: '', ta: ''
  });
  const [body, setBody] = useState<Partial<MultiLanguageText>>({
    ms: '', en: '', zh: '', ta: ''
  });
  const [metadata, setMetadata] = useState<Partial<ContentMetadata>>({
    estimatedReadTime: 5,
    difficulty: 'beginner',
    tags: [],
    relatedMedications: [],
    relatedConditions: []
  });
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [version, setVersion] = useState(1);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatusMap>({
    ms: 'missing',
    en: 'draft',
    zh: 'missing',
    ta: 'missing'
  });

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChanges = useRef(false);

  // Load content if editing
  useEffect(() => {
    if (isEdit && contentId) {
      loadContent();
    }
  }, [contentId]);

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges.current) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for 30 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, description, body, metadata, category, type]);

  // Mark as changed when content updates
  const markAsChanged = useCallback(() => {
    hasUnsavedChanges.current = true;
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const content = await adminService.getContent(contentId!);

      setType(content.type);
      setCategory(content.category);
      setTitle(content.title);
      setDescription(content.description);
      setBody(content.body);
      setMetadata(content.metadata);
      setStatus(content.status);
      setVersion(content.version);

      // Load translation status
      const translations = await adminService.getTranslationStatus(contentId!);
      setTranslationStatus(translations);
    } catch (error) {
      Alert.alert('Error', 'Failed to load content');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSave = async () => {
    if (!hasUnsavedChanges.current) return;

    try {
      await handleSaveDraft(true);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSaveDraft = async (isAutoSave = false) => {
    try {
      setSaving(true);

      const data: CreateContentRequest | UpdateContentRequest = {
        type,
        category,
        title,
        description,
        body,
        metadata,
        status: 'draft'
      };

      let savedContent: EducationContent;

      if (isEdit && contentId) {
        savedContent = await adminService.updateContent(contentId, data as UpdateContentRequest);
      } else {
        savedContent = await adminService.createContent(data as CreateContentRequest);
        // Update navigation params to switch to edit mode
        navigation.setParams({ contentId: savedContent.id });
      }

      setVersion(savedContent.version);
      hasUnsavedChanges.current = false;
      setLastSaved(new Date());

      if (!isAutoSave) {
        Alert.alert('Success', 'Draft saved successfully');
      }
    } catch (error) {
      if (!isAutoSave) {
        Alert.alert('Error', 'Failed to save draft');
      }
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    // Validate all languages have content
    const missingLanguages: string[] = [];
    const languages: Language[] = ['ms', 'en', 'zh', 'ta'];

    languages.forEach(lang => {
      if (!title[lang]?.trim() || !description[lang]?.trim() || !body[lang]?.trim()) {
        missingLanguages.push(lang.toUpperCase());
      }
    });

    if (missingLanguages.length > 0) {
      Alert.alert(
        'Missing Translations',
        `Please complete content for: ${missingLanguages.join(', ')}`
      );
      return;
    }

    if (!category) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }

    try {
      setSaving(true);

      // Save current changes first
      if (hasUnsavedChanges.current) {
        await handleSaveDraft(true);
      }

      // Submit for review
      await adminService.submitForReview(contentId!);

      Alert.alert('Success', 'Content submitted for medical review', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit for review');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    Alert.alert(
      'Publish Content',
      'Are you sure you want to publish this content? It will be visible to all users.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              setSaving(true);
              await adminService.publishContent(contentId!);
              Alert.alert('Success', 'Content published successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to publish content');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const updateTitle = (lang: Language, text: string) => {
    setTitle({ ...title, [lang]: text });
    markAsChanged();
  };

  const updateDescription = (lang: Language, text: string) => {
    setDescription({ ...description, [lang]: text });
    markAsChanged();
  };

  const updateBody = (lang: Language, html: string) => {
    setBody({ ...body, [lang]: html });
    markAsChanged();
  };

  const handleMetadataChange = (newMetadata: Partial<ContentMetadata>) => {
    setMetadata(newMetadata);
    markAsChanged();
  };

  const handleTypeChange = (newType: ContentType) => {
    setType(newType);
    markAsChanged();
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    markAsChanged();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Content' : 'Create Content'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Version {version} • {status}
          {lastSaved && ` • Saved ${lastSaved.toLocaleTimeString()}`}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Content Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Information</Text>
          <ContentMetadataForm
            type={type}
            category={category}
            metadata={metadata}
            onTypeChange={handleTypeChange}
            onCategoryChange={handleCategoryChange}
            onMetadataChange={handleMetadataChange}
          />
        </View>

        {/* Language Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Translations</Text>
          <LanguageTabBar
            currentLanguage={currentLanguage}
            onLanguageChange={setCurrentLanguage}
            translationStatus={translationStatus}
            showStatus={true}
          />
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Title ({currentLanguage.toUpperCase()}) *</Text>
          <TextInput
            style={styles.input}
            value={title[currentLanguage] || ''}
            onChangeText={(text) => updateTitle(currentLanguage, text)}
            placeholder="Enter content title"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Description ({currentLanguage.toUpperCase()}) *</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description[currentLanguage] || ''}
            onChangeText={(text) => updateDescription(currentLanguage, text)}
            placeholder="Enter brief description"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Rich Text Editor */}
        <View style={styles.section}>
          <Text style={styles.label}>Content ({currentLanguage.toUpperCase()}) *</Text>
          <RichTextEditor
            initialContent={body[currentLanguage] || ''}
            onChange={(html) => updateBody(currentLanguage, html)}
            placeholder={`Enter ${currentLanguage.toUpperCase()} content here...`}
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => handleSaveDraft(false)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.buttonTextSecondary}>Save Draft</Text>
          )}
        </TouchableOpacity>

        {status === 'draft' && contentId && (
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleSubmitForReview}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Submit for Review</Text>
          </TouchableOpacity>
        )}

        {status === 'approved' && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSuccess]}
            onPress={handlePublish}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Publish</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333'
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    justifyContent: 'space-between'
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF'
  },
  buttonPrimary: {
    backgroundColor: '#007AFF'
  },
  buttonSuccess: {
    backgroundColor: '#34C759'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
