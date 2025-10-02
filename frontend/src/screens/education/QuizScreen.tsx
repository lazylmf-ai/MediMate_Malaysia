/**
 * Quiz Screen
 *
 * Main quiz interface with:
 * - Question navigation (Previous/Next)
 * - Answer tracking
 * - Progress indicator
 * - Submit functionality with achievement checking
 * - Large touch targets for elderly users
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppSelector } from '@/store/hooks';
import { quizService } from '@/services/quizService';
import { gamificationService } from '@/services/gamificationService';
import { QuizQuestion, ProgressIndicator, AchievementModal } from '@/components/education';
import type { Quiz, Badge, QuizResult } from '@/types/education';
import type { EducationStackScreenProps } from '@/types/navigation';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

type Props = EducationStackScreenProps<'Quiz'>;

export default function QuizScreen({ route, navigation }: Props) {
  const { quizId } = route.params;
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizService.getQuizById(quizId);

      if (response.success && response.data) {
        setQuiz(response.data);
      } else {
        Alert.alert(
          getAlertTitle('error'),
          response.error || getErrorMessage('loadFailed'),
          [{ text: getAlertButton('ok'), onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert(
        getAlertTitle('error'),
        getErrorMessage('loadFailed'),
        [{ text: getAlertButton('ok'), onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerId,
    }));
  };

  const handleNext = () => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Validate all questions are answered
    const validation = quizService.validateAnswers(quiz, answers);
    if (!validation.valid) {
      Alert.alert(
        getAlertTitle('incomplete'),
        getErrorMessage('unanswered', validation.missingQuestions.length),
        [{ text: getAlertButton('ok') }]
      );
      return;
    }

    try {
      setSubmitting(true);

      // Submit quiz
      const response = await quizService.submitQuiz(quizId, answers);

      if (!response.success || !response.data) {
        Alert.alert(
          getAlertTitle('error'),
          response.error || getErrorMessage('submitFailed'),
          [{ text: getAlertButton('ok') }]
        );
        return;
      }

      const result = response.data;

      // Check for new achievements
      const newBadges = await gamificationService.checkAchievements();

      // Navigate to results screen
      navigation.replace('QuizResults', {
        quizId,
        submissionId: result.submission.id,
        score: result.submission.score,
        passed: result.submission.passed,
      });

      // Show achievement modal if any badges were earned
      if (newBadges.length > 0) {
        // Show first badge (can be extended to show all badges)
        setNewBadge(newBadges[0]);
        setShowAchievementModal(true);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert(
        getAlertTitle('error'),
        getErrorMessage('submitFailed'),
        [{ text: getAlertButton('ok') }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAchievementClose = () => {
    setShowAchievementModal(false);
    setNewBadge(null);
  };

  const getAlertTitle = (type: 'error' | 'incomplete') => {
    switch (type) {
      case 'error':
        return language === 'ms' ? 'Ralat' : language === 'zh' ? '错误' : language === 'ta' ? 'பிழை' : 'Error';
      case 'incomplete':
        return language === 'ms' ? 'Kuiz Tidak Lengkap' : language === 'zh' ? '测验未完成' : language === 'ta' ? 'வினாடி வினா முழுமையடையவில்லை' : 'Quiz Incomplete';
      default:
        return '';
    }
  };

  const getAlertButton = (type: 'ok' | 'cancel') => {
    switch (type) {
      case 'ok':
        return language === 'ms' ? 'OK' : language === 'zh' ? '确定' : language === 'ta' ? 'சரி' : 'OK';
      case 'cancel':
        return language === 'ms' ? 'Batal' : language === 'zh' ? '取消' : language === 'ta' ? 'ரத்து' : 'Cancel';
      default:
        return '';
    }
  };

  const getErrorMessage = (type: 'loadFailed' | 'submitFailed' | 'unanswered', count?: number) => {
    switch (type) {
      case 'loadFailed':
        return language === 'ms' ? 'Gagal memuatkan kuiz. Sila cuba lagi.' : language === 'zh' ? '加载测验失败。请重试。' : language === 'ta' ? 'வினாடி வினாவை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Failed to load quiz. Please try again.';
      case 'submitFailed':
        return language === 'ms' ? 'Gagal menghantar kuiz. Sila cuba lagi.' : language === 'zh' ? '提交测验失败。请重试。' : language === 'ta' ? 'வினாடி வினாவை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Failed to submit quiz. Please try again.';
      case 'unanswered':
        return language === 'ms' ? `Anda belum menjawab ${count} soalan. Sila jawab semua soalan sebelum menghantar.` : language === 'zh' ? `您还有 ${count} 个问题未回答。请回答所有问题后再提交。` : language === 'ta' ? `நீங்கள் இன்னும் ${count} கேள்விகளுக்கு பதிலளிக்கவில்லை. அனைத்து கேள்விகளுக்கும் பதிலளித்த பிறகு சமர்ப்பிக்கவும்.` : `You have ${count} unanswered questions. Please answer all questions before submitting.`;
      default:
        return '';
    }
  };

  const getButtonText = (type: 'previous' | 'next' | 'submit') => {
    switch (type) {
      case 'previous':
        return language === 'ms' ? 'Sebelumnya' : language === 'zh' ? '上一题' : language === 'ta' ? 'முந்தைய' : 'Previous';
      case 'next':
        return language === 'ms' ? 'Seterusnya' : language === 'zh' ? '下一题' : language === 'ta' ? 'அடுத்து' : 'Next';
      case 'submit':
        return language === 'ms' ? 'Hantar Kuiz' : language === 'zh' ? '提交测验' : language === 'ta' ? 'வினாடி வினாவை சமர்ப்பிக்கவும்' : 'Submit Quiz';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === 'ms' ? 'Tiada soalan tersedia' : language === 'zh' ? '没有可用的问题' : language === 'ta' ? 'கேள்விகள் கிடைக்கவில்லை' : 'No questions available'}
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>
              {language === 'ms' ? 'Kembali' : language === 'zh' ? '返回' : language === 'ta' ? 'திரும்பு' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Progress Indicator */}
      <ProgressIndicator current={currentQuestion + 1} total={quiz.questions.length} />

      {/* Quiz Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <QuizQuestion
          question={currentQuestionData}
          selectedAnswer={answers[currentQuestionData.id]}
          onAnswerSelect={(answerId) => handleAnswerSelect(currentQuestionData.id, answerId)}
          disabled={submitting}
        />
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <View style={styles.buttonRow}>
          {/* Previous Button */}
          {currentQuestion > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handlePrevious}
              disabled={submitting}
              accessibilityLabel={getButtonText('previous')}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>{getButtonText('previous')}</Text>
            </TouchableOpacity>
          )}

          {/* Next/Submit Button */}
          {isLastQuestion ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityLabel={getButtonText('submit')}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{getButtonText('submit')}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleNext}
              disabled={submitting}
              accessibilityLabel={getButtonText('next')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>{getButtonText('next')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Achievement Modal */}
      <AchievementModal
        badge={newBadge}
        visible={showAchievementModal}
        onClose={handleAchievementClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    color: COLORS.gray[700],
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  scrollContent: {
    flexGrow: 1,
  },
  navigationContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 56, // Large touch target for elderly users
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  secondaryButtonText: {
    color: COLORS.gray[700],
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
});
