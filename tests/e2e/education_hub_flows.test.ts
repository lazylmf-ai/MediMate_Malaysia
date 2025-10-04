import { test, expect } from '@playwright/test';

test.describe('Education Hub User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/education');
  });

  test('User can browse and start a learning journey', async ({ page }) => {
    // Test content discovery and recommendation
    const recommendedContent = await page.locator('.recommended-content').first();
    await expect(recommendedContent).toBeVisible();

    await recommendedContent.click();
    await expect(page).toHaveURL(/\/content\/[\w-]+/);

    // Verify content details render
    await expect(page.locator('.content-title')).toBeVisible();
    await expect(page.locator('.content-description')).toBeVisible();
  });

  test('Quiz completion flow', async ({ page }) => {
    // Navigate to a specific course and start quiz
    await page.goto('/education/diabetes-management');
    const startQuizButton = page.locator('button:has-text("Start Quiz")');
    await startQuizButton.click();

    // Complete quiz
    const quizQuestions = page.locator('.quiz-question');
    const totalQuestions = await quizQuestions.count();

    for (let i = 0; i < totalQuestions; i++) {
      const currentQuestion = quizQuestions.nth(i);
      const answers = currentQuestion.locator('.quiz-answer');
      await answers.first().click();
    }

    const submitButton = page.locator('button:has-text("Submit")');
    await submitButton.click();

    // Verify quiz results
    await expect(page.locator('.quiz-result')).toBeVisible();
    await expect(page.locator('.score-percentage')).toBeVisible();
  });

  test('Offline content download and sync', async ({ page }) => {
    await page.goto('/education/offline-content');

    const downloadButtons = page.locator('.download-content-btn');
    const firstDownloadButton = downloadButtons.first();

    await firstDownloadButton.click();

    // Wait for download and verify
    const downloadStatus = page.locator('.download-status');
    await expect(downloadStatus).toHaveText('Download Complete');

    // Verify offline mode functionality
    await page.goto('/education?mode=offline');
    await expect(page.locator('.offline-content')).toBeVisible();
  });
});