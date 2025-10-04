/**
 * ArticleRenderer Component
 *
 * Rich text article renderer for educational content.
 * Supports headings, paragraphs, lists, images, and multi-language content.
 * Includes adjustable font size for accessibility.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  TouchableOpacity,
} from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { useCulturalTheme } from '@/components/language/ui/CulturalThemeProvider';
import type { EducationContent } from '@/types/education';

interface ArticleRendererProps {
  content: EducationContent;
  allowFontAdjustment?: boolean;
}

export const ArticleRenderer: React.FC<ArticleRendererProps> = ({
  content,
  allowFontAdjustment = true,
}) => {
  const { theme } = useCulturalTheme();
  const language = useAppSelector(state => state.cultural.profile?.language ?? 'en');
  const [fontScale, setFontScale] = useState(1.0);

  // Get localized content
  const articleContent = useMemo(() => content.content[language], [content.content, language]);
  const articleTitle = useMemo(() => content.title[language], [content.title, language]);

  // Simple markdown-like parser (in production, use a proper markdown library)
  const parseContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        elements.push(<View key={`space-${index}`} style={styles.spacer} />);
        return;
      }

      // Heading 1
      if (trimmedLine.startsWith('# ')) {
        elements.push(
          <Text key={`h1-${index}`} style={[styles.h1, { fontSize: 24 * fontScale }]}>
            {trimmedLine.substring(2)}
          </Text>
        );
        return;
      }

      // Heading 2
      if (trimmedLine.startsWith('## ')) {
        elements.push(
          <Text key={`h2-${index}`} style={[styles.h2, { fontSize: 20 * fontScale }]}>
            {trimmedLine.substring(3)}
          </Text>
        );
        return;
      }

      // Heading 3
      if (trimmedLine.startsWith('### ')) {
        elements.push(
          <Text key={`h3-${index}`} style={[styles.h3, { fontSize: 18 * fontScale }]}>
            {trimmedLine.substring(4)}
          </Text>
        );
        return;
      }

      // Unordered list
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        elements.push(
          <View key={`list-${index}`} style={styles.listItem}>
            <Text style={[styles.bullet, { fontSize: 16 * fontScale }]}>•</Text>
            <Text style={[styles.paragraph, { fontSize: 16 * fontScale }]}>
              {trimmedLine.substring(2)}
            </Text>
          </View>
        );
        return;
      }

      // Ordered list
      const orderedListMatch = trimmedLine.match(/^(\d+)\.\s(.+)/);
      if (orderedListMatch) {
        elements.push(
          <View key={`ordered-${index}`} style={styles.listItem}>
            <Text style={[styles.bullet, { fontSize: 16 * fontScale }]}>
              {orderedListMatch[1]}.
            </Text>
            <Text style={[styles.paragraph, { fontSize: 16 * fontScale }]}>
              {orderedListMatch[2]}
            </Text>
          </View>
        );
        return;
      }

      // Image (simple URL detection)
      const imageMatch = trimmedLine.match(/!\[.*?\]\((.*?)\)/);
      if (imageMatch) {
        elements.push(
          <Image
            key={`img-${index}`}
            source={{ uri: imageMatch[1] }}
            style={styles.image}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        );
        return;
      }

      // Bold text
      const boldText = trimmedLine.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1);

      // Regular paragraph
      elements.push(
        <Text key={`p-${index}`} style={[styles.paragraph, { fontSize: 16 * fontScale }]}>
          {trimmedLine.includes('**') ? (
            <Text style={styles.bold}>{boldText}</Text>
          ) : (
            trimmedLine
          )}
        </Text>
      );
    });

    return elements;
  };

  const increaseFontSize = () => {
    setFontScale(Math.min(fontScale + 0.1, 1.5));
  };

  const decreaseFontSize = () => {
    setFontScale(Math.max(fontScale - 0.1, 0.8));
  };

  const resetFontSize = () => {
    setFontScale(1.0);
  };

  const getFontSizeLabel = (): string => {
    const labels = {
      en: 'Font Size',
      ms: 'Saiz Fon',
      zh: '字体大小',
      ta: 'எழுத்துரு அளவு',
    };
    return labels[language] || labels.en;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    } as ViewStyle,
    fontControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    } as ViewStyle,
    fontControlsLabel: {
      fontSize: 14 * theme.accessibility.textScaling,
      color: theme.colors.text,
      fontWeight: '600',
    } as TextStyle,
    fontButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    } as ViewStyle,
    fontButton: {
      width: theme.accessibility.minimumTouchTarget,
      height: theme.accessibility.minimumTouchTarget,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    fontButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    } as TextStyle,
    scrollContent: {
      padding: theme.spacing.lg,
    } as ViewStyle,
    title: {
      fontSize: 28 * fontScale * theme.accessibility.textScaling,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      lineHeight: 36 * fontScale,
    } as TextStyle,
    h1: {
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      lineHeight: 32 * fontScale,
    } as TextStyle,
    h2: {
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      lineHeight: 28 * fontScale,
    } as TextStyle,
    h3: {
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      lineHeight: 24 * fontScale,
    } as TextStyle,
    paragraph: {
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      lineHeight: 24 * fontScale,
    } as TextStyle,
    bold: {
      fontWeight: '700',
    } as TextStyle,
    listItem: {
      flexDirection: 'row',
      marginBottom: theme.spacing.sm,
      paddingLeft: theme.spacing.md,
    } as ViewStyle,
    bullet: {
      color: theme.colors.text,
      marginRight: theme.spacing.sm,
      fontWeight: '600',
    } as TextStyle,
    image: {
      width: '100%',
      height: 200,
      marginVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    } as ImageStyle,
    spacer: {
      height: theme.spacing.sm,
    } as ViewStyle,
  });

  return (
    <View style={styles.container}>
      {/* Font Size Controls */}
      {allowFontAdjustment && (
        <View style={styles.fontControls}>
          <Text style={styles.fontControlsLabel}>{getFontSizeLabel()}</Text>
          <View style={styles.fontButtons}>
            <TouchableOpacity
              style={styles.fontButton}
              onPress={decreaseFontSize}
              disabled={fontScale <= 0.8}
              accessibilityRole="button"
              accessibilityLabel="Decrease font size"
            >
              <Text style={styles.fontButtonText}>A-</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fontButton}
              onPress={resetFontSize}
              accessibilityRole="button"
              accessibilityLabel="Reset font size"
            >
              <Text style={styles.fontButtonText}>A</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fontButton}
              onPress={increaseFontSize}
              disabled={fontScale >= 1.5}
              accessibilityRole="button"
              accessibilityLabel="Increase font size"
            >
              <Text style={styles.fontButtonText}>A+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Article Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          {articleTitle}
        </Text>
        {parseContent(articleContent)}
      </ScrollView>
    </View>
  );
};

export default ArticleRenderer;
