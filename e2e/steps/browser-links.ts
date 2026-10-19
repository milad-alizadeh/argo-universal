import { expect } from '../fixtures';
import { When, Then } from './fixtures';

const website = 'https://example.org/website';

declare global {
  var desktopBrowserLinks: string[];
}

When(
  'I open a website link from the desktop renderer',
  async ({ app, page }) => {
    if (!app.desktop) throw new Error('This scenario needs Electron');
    // Replace only the OS browser boundary; the real window handlers still run.
    await app.desktop.application.evaluate(({ shell }) => {
      globalThis.desktopBrowserLinks = [];
      shell.openExternal = async (url) => {
        globalThis.desktopBrowserLinks.push(url);
      };
    });
    await page.evaluate(`
      window.open(${JSON.stringify(website)}, '_blank', 'noopener');
      window.open('file:///tmp/argo-browser-link', '_blank', 'noopener');
    `);
  },
);

Then(
  'the system browser receives the website and the App stays open',
  async ({ app, page }) => {
    if (!app.desktop) throw new Error('This scenario needs Electron');
    const application = app.desktop.application;
    await expect
      .poll(() => application.evaluate(() => globalThis.desktopBrowserLinks))
      .toEqual([website]);
    expect(page.isClosed()).toBe(false);
    expect(new URL(page.url()).protocol).toBe('app:');
    expect(application.windows()).toHaveLength(1);
  },
);
