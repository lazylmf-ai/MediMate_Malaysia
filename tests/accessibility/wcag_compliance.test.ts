import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Compliance', () => {
  const routes = [
    '/education',
    '/education/content/diabetes',
    '/education/profile',
    '/education/quiz/diabetes-management'
  ];

  routes.forEach(route => {
    test(`Accessibility scan for ${route}`, async ({ page }) => {
      await page.goto(route);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toHaveLength(0);
    });
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/education');

    // Test screen reader compatibility elements
    const screenReaderElements = [
      { selector: 'h1', expectedRole: 'heading' },
      { selector: 'button', expectedRole: 'button' },
      { selector: 'nav', expectedRole: 'navigation' }
    ];

    for (const element of screenReaderElements) {
      const locator = page.locator(element.selector);
      await expect(locator).toHaveAttribute('role', element.expectedRole);
    }
  });
});