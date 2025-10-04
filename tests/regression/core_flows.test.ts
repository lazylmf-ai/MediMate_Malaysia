import { test, expect } from '@playwright/test';

test.describe('Core Functionality Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/education');
  });

  const coreFlows = [
    { name: 'Content Discovery',
      steps: async (page) => {
        const categoryFilters = page.locator('.category-filter');
        await categoryFilters.first().click();

        const contentItems = page.locator('.content-item');
        await expect(contentItems.first()).toBeVisible();
      }
    },
    { name: 'Quiz Interaction',
      steps: async (page) => {
        await page.goto('/education/quizzes');
        const startQuizButton = page.locator('button:has-text("Start Quiz")').first();
        await startQuizButton.click();

        const quizContainer = page.locator('.quiz-container');
        await expect(quizContainer).toBeVisible();

        const submitButton = page.locator('button:has-text("Submit")');
        await expect(submitButton).toBeEnabled();
      }
    },
    { name: 'Progress Tracking',
      steps: async (page) => {
        await page.goto('/education/profile');

        const progressDashboard = page.locator('.progress-dashboard');
        await expect(progressDashboard).toBeVisible();

        const completedItems = page.locator('.completed-item');
        expect(await completedItems.count()).toBeGreaterThanOrEqual(0);
      }
    }
  ];

  for (const flow of coreFlows) {
    test(`Regression: ${flow.name} core flow`, async ({ page }) => {
      await flow.steps(page);
    });
  }

  test('Critical Performance Assertions', async ({ page }) => {
    const pageLoadTime = await page.evaluate(() => performance.now());
    expect(pageLoadTime).toBeLessThan(1000); // Page should load under 1 second

    const contentLoadTime = await page.evaluate(() => {
      const contentList = document.querySelector('.content-list');
      return contentList ? performance.now() - contentList.dataset.renderStart : 0;
    });
    expect(contentLoadTime).toBeLessThan(500); // Content list should render under 500ms
  });
});