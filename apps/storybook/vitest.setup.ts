import { beforeEach } from 'vitest';
import { page, server } from 'vitest/browser';

// Play functions resize the page, so every story starts at the configured viewport.
beforeEach(async ({ task, onTestFailed }) => {
  const { width, height } = server.config.browser.viewport;
  await page.viewport(width, height);
  // Vitest's own failure screenshot finds an unmounted page here, so take it while the story is still up.
  onTestFailed(async () => {
    const name = task.fullTestName.replace(/\W/g, '-');
    await page
      .screenshot({ path: `__screenshots__/failures/${name}.png` })
      .catch((error: unknown) => console.error('No failure screenshot', error));
  });
});
