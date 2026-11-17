import { afterAll, beforeEach } from 'vitest';
import { cdp, page, server } from 'vitest/browser';
import { installShardProbe } from './shard-probe';

installShardProbe();

const STORY_CLEANUP_TIMEOUT_MS = 90_000;

/*
 * Release memory between story files. Collection can outlast assertions on a loaded runner,
 * so it has a separate cleanup budget.
 * Stories may emulate touch or resize the page; each starts with a mouse and the configured viewport.
 */
afterAll(async () => {
  await cdp().send('HeapProfiler.collectGarbage');
}, STORY_CLEANUP_TIMEOUT_MS);

beforeEach(async ({ task, onTestFailed }) => {
  if (matchMedia('(pointer: coarse)').matches)
    await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });

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
