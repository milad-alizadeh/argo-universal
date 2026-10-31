import { afterAll, beforeEach } from 'vitest';
import { cdp, page, server } from 'vitest/browser';
import { installShardProbe } from './shard-probe';

installShardProbe();

afterAll(async () => {
  await cdp().send('HeapProfiler.collectGarbage');
});

// Play functions resize the page, so every story starts at the configured viewport.
beforeEach(async ({ task, onTestFailed }) => {
  const { width, height } = server.config.browser.viewport;
  await page.viewport(width, height);
  // Vitest's own failure screenshot finds an unmounted page here, so take it while the story is still up.
  onTestFailed(async () => {
    const name = task.fullTestName.replaceAll(/\W/g, '-');

    try {
      await page.screenshot({ path: `__screenshots__/failures/${name}.png` });
    } catch (error) {
      console.error('No failure screenshot', error);
    }
  });
});
