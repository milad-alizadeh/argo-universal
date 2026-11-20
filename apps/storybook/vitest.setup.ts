import { afterAll, beforeEach } from 'vitest';
import { cdp, page, server } from 'vitest/browser';
import { installShardProbe } from './shard-probe';

// The probe wraps requestAnimationFrame and the console and watches every DOM change, so it runs only when diagnosing a failure that shows up in CI alone.
if (import.meta.env.ARGO_SHARD_PROBE === '1') installShardProbe();

const STORY_CLEANUP_TIMEOUT_MS = 90_000;

// A file's stories leave the page well under this; only a file that grows the heap this far needs a collection before the next one.
const COLLECT_ABOVE_BYTES = 500 * 1024 * 1024;

interface ChromiumMemory {
  usedJSHeapSize: number;
}

function usedHeapBytes(): number {
  const { memory } = performance as Performance & { memory?: ChromiumMemory };

  return memory?.usedJSHeapSize ?? Number.POSITIVE_INFINITY;
}

/*
 * Release memory between story files, but only when the page holds a lot of it. Collection can outlast
 * assertions on a loaded runner, so it has a separate cleanup budget.
 * Stories may emulate touch or resize the page; each starts with a mouse and the configured viewport.
 */
afterAll(async () => {
  if (usedHeapBytes() > COLLECT_ABOVE_BYTES)
    await cdp().send('HeapProfiler.collectGarbage');
}, STORY_CLEANUP_TIMEOUT_MS);

beforeEach(async ({ task, onTestFailed }) => {
  if (matchMedia('(pointer: coarse)').matches)
    await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });

  // A story that resized the page is put back; one that did not leaves the browser's resize alone.
  const { width, height } = server.config.browser.viewport;

  if (window.innerWidth !== width || window.innerHeight !== height)
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
