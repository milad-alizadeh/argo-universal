import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  // Stories live in @repo/client; the extglob leaves out *.test.stories.tsx (ADR 0010).
  stories: ['../../../packages/client/src/**/!(*.test).stories.tsx'],
  deviceAddons: [
    '@storybook/addon-ondevice-controls',
    '@storybook/addon-ondevice-actions',
  ],
};

export default main;
