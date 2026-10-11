import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

// Above the largest waitFor budget (15 s), so a slow waitFor fails with its own message.
const STORY_TEST_TIMEOUT_MS = 30_000;

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineProject({
  plugins: [
    // The plugin will run tests for the stories defined in your Storybook config
    // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
    storybookTest({
      configDir: `${import.meta.dirname}/.storybook`,
      storybookUrl: process.env.STORYBOOK_URL ?? 'http://localhost:6006',
      tags: { exclude: ['third-party'] },
    }),
  ],
  test: {
    name: 'storybook',
    maxWorkers: 2,
    testTimeout: STORY_TEST_TIMEOUT_MS,
    // Zero retries: a flaky story fails like a flaky end-to-end test.
    retry: 0,
    sequence: { groupOrder: 1 },
    setupFiles: ['./vitest.setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: 'chromium' }],
    },
  },
});
