import { beforeEach } from 'vitest';
import { page, server } from 'vitest/browser';

// Play functions resize the page, so every story starts at the configured viewport.
beforeEach(async () => {
  const { width, height } = server.config.browser.viewport;
  await page.viewport(width, height);
});
