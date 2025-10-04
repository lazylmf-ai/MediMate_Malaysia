/**
 * Quiz Question Component
 *
 * Individual quiz question with multiple-choice options.
 * Features:
 * - Large touch targets (56px min height) for elderly users
 * - Visual feedback for selected answers
 * - Results mode showing correct/incorrect with explanations
 * - High contrast colors for accessibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { QuizQuestion as QuizQuestionType } from '@/types/education';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';

interface QuizQuestionProps {
  question: QuizQuestionType;
  selectedAnswer?: string;
  onAnswerSelect: (answerId: string) => void;
  showCorrectAnswer?: boolean; // For results view
  disabled?: boolean;
}

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  showCorrectAnswer = false,
  disabled = false,
}) => {
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const correctOption = question.options.find((opt) => opt.isCorrect);
  const isAnswerCorrect = selectedAnswer === correctOption?.id;

  const getExplanationLabel = () => {
    switch (language) {
      case 'ms':
        return 'Penjelasan:';
      case 'zh':
        return '解释：';
      case 'ta':
        return 'விளக்கம்:';
      default:
        return 'Explanation:';
    }
  };

  const getOptionStyle = (optionId: string, isCorrect: boolean) => {
    const styles = [stylesObj.option];

    if (showCorrectAnswer) {
      // Results mode: show correct/incorrect
      if (isCorrect) {
        styles.push(stylesObj.correctOption);
      } else if (selectedAnswer === optionId && !isCorrect) {
        styles.push(stylesObj.wrongOption);
      }
    } else {
      // Quiz mode: show selection
      if (selectedAnswer === optionId) {
        styles.push(stylesObj.selectedOption);
      }
    }

    return styles;
  };

  const getOptionTextStyle = (optionId: string, isCorrect: boolean) => {
    const styles = [stylesObj.optionText];

    if (showCorrectAnswer) {
      if (isCorrect) {
        styles.push(stylesObj.correctOptionText);
      } else if (selectedAnswer === optionId && !isCorrect) {
        styles.push(stylesObj.wrongOptionText);
      }
    } else {
      if (selectedAnswer === optionId) {
        styles.push(stylesObj.selectedOptionText);
      }
    }

    return styles;
  };

  return (
    <View style={stylesObj.container}>
      {/* Question Text */}
      <Text style={stylesObj.questionText}>{question.text[language]}</Text>

      {/* Answer Options */}
      <View style={stylesObj.optionsContainer}>
        {question.options.map((option, index) => {
          const optionLetter = String.fromCharCode(65 + index); // A, B, C, D

          return (
            <TouchableOpacity
              key={option.id}
              style={getOptionStyle(option.id, option.isCorrect)}
              onPress={() => !disabled && !showCorrectAnswer && onAnswerSelect(option.id)}
              disabled={disabled || showCorrectAnswer}
              accessibilityLabel={`${language === 'ms' ? 'Pilihan' : language === 'zh' ? '选项' : language === 'ta' ? 'விருப்பம்' : 'Option'} ${optionLetter}: ${option.text[language]}`}
              accessibilityRole="button"
              accessibilityState={{
                selected: selectedAnswer === option.id,
                disabled: disabled || showCorrectAnswer,
              }}
            >
              <View style={stylesObj.optionContent}>
                {/* Option Letter Badge */}
                <View
                  style={[
                    stylesObj.optionBadge,
                    selectedAnswer === option.id && !showCorrectAnswer && stylesObj.selectedBadge,
                    showCorrectAnswer && option.isCorrect && stylesObj.correctBadge,
                    showCorrectAnswer && selectedAnswer === option.id && !option.isCorrect && stylesObj.wrongBadge,
                  ]}
                >
                  <Text
                    style={[
                      stylesObj.optionBadgeText,
                      selectedAnswer === option.id && !showCorrectAnswer && stylesObj.selectedBadgeText,
                      showCorrectAnswer && option.isCorrect && stylesObj.correctBadgeText,
                      showCorrectAnswer && selectedAnswer === option.id && !option.isCorrect && stylesObj.wrongBadgeText,
                    ]}
                  >
                    {optionLetter}
                  </Text>
                </View>

                {/* Option Text */}
                <Text style={getOptionTextStyle(option.id, option.isCorrect)}>
                  {option.text[language]}
                </Text>

                {/* Checkmark for correct answer in results mode */}
                {showCorrectAnswer && option.isCorrect && (
                  <Text style={stylesObj.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Explanation (shown in results mode) */}
      {showCorrectAnswer && question.explanation && (
        <View style={stylesObj.explanationContainer}>
          <Text style={stylesObj.explanationLabel}>{getExplanationLabel()}</Text>
          <Text style={stylesObj.explanationText}>
            {question.explanation[language]}
          </Text>
        </View>
      )}
    </View>
  );
};

const stylesObj = StyleSheet.create({
  container: {
    padding: 20,
  },
  questionText: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    lineHeight: 28,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    minHeight: 56, // Large touch target for elderly users
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  correctOption: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '10',
  },
  wrongOption: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '10',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    backgroundColor: COLORS.primary,
  },
  correctBadge: {
    backgroundColor: COLORS.success,
  },
  wrongBadge: {
    backgroundColor: COLORS.error,
  },
  optionBadgeText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[700],
  },
  selectedBadgeText: {
    color: COLORS.white,
  },
  correctBadgeText: {
    color: COLORS.white,
  },
  wrongBadgeText: {
    color: COLORS.white,
  },
  optionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  correctOptionText: {
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  wrongOptionText: {
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  checkmark: {
    fontSize: 24,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  explanationContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  explanationLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  explanationText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
    lineHeight: 24,
  },
});
