import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject } from 'vitest/config';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineProject({
  plugins: [
    // The plugin will run tests for the stories defined in your Storybook config
    // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
    storybookTest({
      configDir: `${import.meta.dirname}/.storybook`,
      tags: { exclude: ['third-party'] },
    }),
  ],
  test: {
    name: 'storybook',
    maxWorkers: 2,
    sequence: { groupOrder: 1 },
    exclude: ['../../packages/client/src/primitives/**'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: 'chromium' }],
    },
  },
});
