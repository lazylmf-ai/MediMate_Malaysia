/**
 * Quiz Results Screen
 *
 * Displays quiz results with score, all questions in review mode,
 * and retry functionality. Shows achievement celebration if new badges earned.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppSelector } from '@/store/hooks';
import { quizService } from '@/services/quizService';
import { QuizQuestion } from '@/components/education';
import type { Quiz, QuizSubmission } from '@/types/education';
import type { EducationStackScreenProps } from '@/types/navigation';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

type Props = EducationStackScreenProps<'QuizResults'>;

export default function QuizResultsScreen({ route, navigation }: Props) {
  const { quizId, submissionId, score, passed } = route.params;
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [submission, setSubmission] = useState<QuizSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizResults();
  }, [quizId, submissionId]);

  const loadQuizResults = async () => {
    try {
      setLoading(true);
      const [quizResponse, submissionResponse] = await Promise.all([
        quizService.getQuizById(quizId),
        quizService.getUserQuizSubmissions(submissionId),
      ]);

      if (quizResponse.success && quizResponse.data) {
        setQuiz(quizResponse.data);
      }

      if (submissionResponse.success && submissionResponse.data) {
        setSubmission(submissionResponse.data);
      }
    } catch (error) {
      console.error('Error loading quiz results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    const response = await quizService.retryQuiz(quizId);
    if (response.success) {
      navigation.replace('Quiz', { quizId });
    }
  };

  const handleBackToHub = () => {
    navigation.navigate('EducationHome');
  };

  const getTitle = () => {
    if (passed) {
      return language === 'ms' ? '🎉 Tahniah!' : language === 'zh' ? '🎉 恭喜!' : language === 'ta' ? '🎉 வாழ்த்துக்கள்!' : '🎉 Congratulations!';
    }
    return language === 'ms' ? 'Hasil Kuiz' : language === 'zh' ? '测验结果' : language === 'ta' ? 'வினாடி வினா முடிவுகள்' : 'Quiz Results';
  };

  const getScoreLabel = () => {
    return language === 'ms' ? 'Skor Anda' : language === 'zh' ? '您的分数' : language === 'ta' ? 'உங்கள் மதிப்பெண்' : 'Your Score';
  };

  const getRetryText = () => {
    return language === 'ms' ? 'Cuba Lagi' : language === 'zh' ? '重试' : language === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Retry Quiz';
  };

  const getBackText = () => {
    return language === 'ms' ? 'Kembali ke Hub' : language === 'zh' ? '返回主页' : language === 'ta' ? 'மீண்டும் முகப்புக்கு' : 'Back to Education Hub';
  };

  const getReviewTitle = () => {
    return language === 'ms' ? 'Semak Jawapan' : language === 'zh' ? '查看答案' : language === 'ta' ? 'பதில்களை மதிப்பாய்வு செய்யவும்' : 'Review Answers';
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Results Header */}
        <View style={[styles.header, passed ? styles.passedHeader : styles.failedHeader]}>
          <Text style={styles.headerTitle}>{getTitle()}</Text>
          <Text style={styles.scoreLabel}>{getScoreLabel()}</Text>
          <Text style={styles.scoreValue}>{score}%</Text>
        </View>

        {/* Review Section */}
        {quiz && submission && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewTitle}>{getReviewTitle()}</Text>
            {quiz.questions.map((question, index) => (
              <View key={question.id} style={styles.questionWrapper}>
                <QuizQuestion
                  question={question}
                  selectedAnswer={submission.answers[question.id]}
                  onAnswerSelect={() => {}}
                  showCorrectAnswer={true}
                  disabled={true}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleRetry}
          accessibilityLabel={getRetryText()}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{getRetryText()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleBackToHub}
          accessibilityLabel={getBackText()}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{getBackText()}</Text>
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 32,
    alignItems: 'center',
  },
  passedHeader: {
    backgroundColor: COLORS.success + '10',
  },
  failedHeader: {
    backgroundColor: COLORS.gray[50],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes['3xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.fontSizes['5xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
  },
  reviewSection: {
    padding: 20,
  },
  reviewTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 20,
  },
  questionWrapper: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    paddingBottom: 24,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
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
