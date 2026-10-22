/*
 * The render gates draw stories outside the story suite, so they reuse this Storybook's own Vite
 * config without the Storybook Vitest plugin, which would index every story as a test of its own.
 */
import { storybookReactNativeWeb } from '@storybook/react-native-web-vite/vite-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineProject, mergeConfig } from 'vitest/config';
import { storybookVite } from './.storybook/main.ts';

const RUN_TIMEOUT_MS = 1_800_000;

/*
 * The preview pins `viewport: 'desktop'` so a story draws the desktop layout, and the gate must draw
 * the same thing: at Vitest's own default width the shell falls back to the phone layout, where a
 * component that sizes itself by width draws one thing for several states and reads as a duplicate.
 */
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

const browser = {
  enabled: true,
  headless: true,
  screenshotFailures: false,
  viewport: DESKTOP_VIEWPORT,
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
