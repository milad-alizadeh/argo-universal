import { beforeEach } from 'vitest';
import { cdp, page, server } from 'vitest/browser';
import { installShardProbe } from './shard-probe';

installShardProbe();

/*
 * Chromium manages collection; forcing it after every file can exceed the hook budget under load.
 * Stories may emulate touch or resize the page; each starts with a mouse and the configured viewport.
 */
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
