/*
 * The render gates draw stories outside the story suite, so they reuse this Storybook's own Vite
 * config without the Storybook Vitest plugin, which would index every story as a test of its own.
 */
import { storybookReactNativeWeb } from '@storybook/react-native-web-vite/vite-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject, mergeConfig } from 'vitest/config';
import { storybookVite } from './.storybook/main.ts';

const RUN_TIMEOUT_MS = 1_800_000;

const browser = {
  enabled: true,
  headless: true,
  screenshotFailures: false,
  provider: playwright({
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  }),
  instances: [{ browser: 'chromium' }],
};

export default defineProject(
  mergeConfig(storybookVite({ plugins: [storybookReactNativeWeb()] }), {
    test: {
      name: 'story-renders',
      include: ['story-renders.test.ts'],
      testTimeout: RUN_TIMEOUT_MS,
      hookTimeout: RUN_TIMEOUT_MS,
      maxWorkers: 1,
      retry: 0,
      browser,
    },
  }),
);
