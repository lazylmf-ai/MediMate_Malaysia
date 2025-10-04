/**
 * ContentFilters Component
 *
 * Search and filter UI for educational content.
 * Supports filtering by type, language, and category with apply/clear actions.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { useCulturalTheme } from '@/components/language/ui/CulturalThemeProvider';
import type { ContentType, SearchFilters } from '@/types/education';

interface ContentFiltersProps {
  onApplyFilters: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  initialFilters?: SearchFilters;
  availableCategories?: string[];
}

export const ContentFilters: React.FC<ContentFiltersProps> = ({
  onApplyFilters,
  onClearFilters,
  initialFilters = {},
  availableCategories = [],
}) => {
  const { theme } = useCulturalTheme();
  const currentLanguage = useAppSelector(state => state.cultural.profile?.language ?? 'en');

  const [selectedType, setSelectedType] = useState<ContentType | undefined>(initialFilters.type);
  const [selectedLanguage, setSelectedLanguage] = useState<'ms' | 'en' | 'zh' | 'ta' | undefined>(
    undefined
  );
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialFilters.category
  );

  const contentTypes: ContentType[] = ['article', 'video', 'infographic', 'quiz'];
  const languages: ('ms' | 'en' | 'zh' | 'ta')[] = ['ms', 'en', 'zh', 'ta'];

  const getTypeLabel = (type: ContentType): string => {
    const typeLabels = {
      en: { article: 'Articles', video: 'Videos', infographic: 'Infographics', quiz: 'Quizzes' },
      ms: { article: 'Artikel', video: 'Video', infographic: 'Infografik', quiz: 'Kuiz' },
      zh: { article: '文章', video: '视频', infographic: '信息图', quiz: '测验' },
      ta: {
        article: 'கட்டுரைகள்',
        video: 'வீடியோக்கள்',
        infographic: 'தகவல்படங்கள்',
        quiz: 'வினாடிவினாக்கள்',
      },
    };
    return typeLabels[currentLanguage]?.[type] || type;
  };

  const getLanguageLabel = (lang: 'ms' | 'en' | 'zh' | 'ta'): string => {
    const languageLabels = {
      en: { ms: 'Malay', en: 'English', zh: 'Chinese', ta: 'Tamil' },
      ms: { ms: 'Bahasa Melayu', en: 'English', zh: '中文', ta: 'தமிழ்' },
      zh: { ms: '马来语', en: '英语', zh: '中文', ta: '泰米尔语' },
      ta: { ms: 'மலாய்', en: 'ஆங்கிலம்', zh: 'சீன மொழி', ta: 'தமிழ்' },
    };
    return languageLabels[currentLanguage]?.[lang] || lang.toUpperCase();
  };

  const getSectionTitle = (section: 'type' | 'language' | 'category'): string => {
    const sectionTitles = {
      en: { type: 'Content Type', language: 'Language', category: 'Category' },
      ms: { type: 'Jenis Kandungan', language: 'Bahasa', category: 'Kategori' },
      zh: { type: '内容类型', language: '语言', category: '类别' },
      ta: { type: 'உள்ளடக்க வகை', language: 'மொழி', category: 'வகை' },
    };
    return sectionTitles[currentLanguage]?.[section] || section;
  };

  const getButtonText = (button: 'apply' | 'clear'): string => {
    const buttonTexts = {
      en: { apply: 'Apply Filters', clear: 'Clear All' },
      ms: { apply: 'Gunakan Penapis', clear: 'Kosongkan Semua' },
      zh: { apply: '应用筛选', clear: '清除全部' },
      ta: { apply: 'வடிகட்டிகளைப் பயன்படுத்து', clear: 'அனைத்தையும் அழி' },
    };
    return buttonTexts[currentLanguage]?.[button] || button;
  };

  const handleApply = () => {
    const filters: SearchFilters = {};
    if (selectedType) filters.type = selectedType;
    if (selectedCategory) filters.category = selectedCategory;
    onApplyFilters(filters);
  };

  const handleClear = () => {
    setSelectedType(undefined);
    setSelectedLanguage(undefined);
    setSelectedCategory(undefined);
    onClearFilters();
  };

  const hasActiveFilters = selectedType || selectedLanguage || selectedCategory;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    } as ViewStyle,
    section: {
      marginBottom: theme.spacing.lg,
    } as ViewStyle,
    sectionTitle: {
      fontSize: 14 * theme.accessibility.textScaling,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    } as TextStyle,
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    } as ViewStyle,
    option: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      minHeight: theme.accessibility.minimumTouchTarget,
      justifyContent: 'center',
    } as ViewStyle,
    optionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    } as ViewStyle,
    optionText: {
      fontSize: 14 * theme.accessibility.textScaling,
      color: theme.colors.text,
      fontWeight: '500',
    } as TextStyle,
    optionTextSelected: {
      color: '#FFFFFF',
      fontWeight: '600',
    } as TextStyle,
    categoryOption: {
      flex: 0,
      flexBasis: 'auto',
    } as ViewStyle,
    actionsContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    } as ViewStyle,
    applyButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      minHeight: theme.accessibility.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    applyButtonDisabled: {
      backgroundColor: theme.colors.border,
    } as ViewStyle,
    applyButtonText: {
      fontSize: 16 * theme.accessibility.textScaling,
      fontWeight: '600',
      color: '#FFFFFF',
    } as TextStyle,
    clearButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      minHeight: theme.accessibility.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    clearButtonText: {
      fontSize: 16 * theme.accessibility.textScaling,
      fontWeight: '600',
      color: theme.colors.text,
    } as TextStyle,
  });

  return (
    <View style={styles.container}>
      {/* Content Type Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{getSectionTitle('type')}</Text>
        <View style={styles.optionsContainer}>
          {contentTypes.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.option, selectedType === type && styles.optionSelected]}
              onPress={() => setSelectedType(selectedType === type ? undefined : type)}
              accessibilityRole="button"
              accessibilityLabel={getTypeLabel(type)}
              accessibilityState={{ selected: selectedType === type }}
            >
              <Text
                style={[styles.optionText, selectedType === type && styles.optionTextSelected]}
              >
                {getTypeLabel(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language Filter */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{getSectionTitle('language')}</Text>
        <View style={styles.optionsContainer}>
          {languages.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[styles.option, selectedLanguage === lang && styles.optionSelected]}
              onPress={() => setSelectedLanguage(selectedLanguage === lang ? undefined : lang)}
              accessibilityRole="button"
              accessibilityLabel={getLanguageLabel(lang)}
              accessibilityState={{ selected: selectedLanguage === lang }}
            >
              <Text
                style={[styles.optionText, selectedLanguage === lang && styles.optionTextSelected]}
              >
                {getLanguageLabel(lang)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category Filter */}
      {availableCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getSectionTitle('category')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionsContainer}
          >
            {availableCategories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.option,
                  styles.categoryOption,
                  selectedCategory === category && styles.optionSelected,
                ]}
                onPress={() =>
                  setSelectedCategory(selectedCategory === category ? undefined : category)
                }
                accessibilityRole="button"
                accessibilityLabel={category}
                accessibilityState={{ selected: selectedCategory === category }}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedCategory === category && styles.optionTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          disabled={!hasActiveFilters}
          accessibilityRole="button"
          accessibilityLabel={getButtonText('clear')}
          accessibilityHint="Clear all selected filters"
        >
          <Text style={styles.clearButtonText}>{getButtonText('clear')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.applyButton, !hasActiveFilters && styles.applyButtonDisabled]}
          onPress={handleApply}
          disabled={!hasActiveFilters}
          accessibilityRole="button"
          accessibilityLabel={getButtonText('apply')}
          accessibilityHint="Apply selected filters to content"
        >
          <Text style={styles.applyButtonText}>{getButtonText('apply')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ContentFilters;
