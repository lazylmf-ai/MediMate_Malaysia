import { test, expect } from '@playwright/test';

test.describe('Multi-Language Functionality', () => {
  const languages = ['ms', 'en', 'zh', 'ta'];
  const testRoutes = [
    '/education',
    '/education/content/diabetes',
    '/education/quiz/diabetes-management'
  ];

  languages.forEach(lang => {
    test(`Language content rendering for ${lang.toUpperCase()}`, async ({ page }) => {
      for (const route of testRoutes) {
        await page.goto(`${route}?lang=${lang}`);

        // Verify language-specific content
        const languageSelector = page.locator(`[data-lang="${lang}"]`);
        await expect(languageSelector).toBeVisible();

        // Check content rendering
        const contentTitle = page.locator('.content-title');
        await expect(contentTitle).toBeVisible();

        // Verify translations
        const translations = await page.evaluate((language) => {
          const elements = document.querySelectorAll('[data-translation]');
          return Array.from(elements).map(el => el.getAttribute('data-translation'));
        }, lang);

        expect(translations.length).toBeGreaterThan(0);
      }
    });
  });

  test('Language switcher functionality', async ({ page }) => {
    await page.goto('/education');

    const languageSwitcher = page.locator('.language-switcher');
    await expect(languageSwitcher).toBeVisible();

    for (const lang of languages) {
      const languageOption = languageSwitcher.locator(`[data-lang="${lang}"]`);
      await languageOption.click();

      // Verify UI updates
      await expect(page.locator('body')).toHaveAttribute('lang', lang);
    }
  });
});