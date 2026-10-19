import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

// Above the largest waitFor budget (15 s), so a slow waitFor fails with its own message.
const STORY_TEST_TIMEOUT_MS = 30_000;

// One browser page per CI core; story tests are CPU-bound.
const CI_WORKERS = 4;

// On a loaded Mac a full local run took 237 s with 2 pages and 292 s with 4, using 1.2 GB less memory.
const LOCAL_WORKERS = 2;

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineProject({
  plugins: [
    /*
     * The plugin will run tests for the stories defined in your Storybook config
     * See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
     */
    storybookTest({
      configDir: `${import.meta.dirname}/.storybook`,
      storybookUrl: process.env.STORYBOOK_URL ?? 'http://localhost:6006',
      tags: { exclude: ['third-party'] },
    }),
  ],
  test: {
    name: 'storybook',
    maxWorkers: process.env.CI ? CI_WORKERS : LOCAL_WORKERS,
    testTimeout: STORY_TEST_TIMEOUT_MS,
    // Zero retries: a flaky story fails like a flaky end-to-end test.
    retry: 0,
    sequence: { groupOrder: 1 },
    // One browser suite at a time on this Mac; others queue (docs/agents/storybook.md).
    globalSetup: ['./vitest.global-setup.ts'],
    setupFiles: ['./vitest.setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      // Audio and Video stories press play from synthetic events, which Chromium's autoplay policy refuses.
      provider: playwright({
        launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
