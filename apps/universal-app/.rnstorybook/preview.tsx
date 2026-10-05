import {
  withNavigationMocks,
  withReusablesPreview,
  withTrpcMocks,
} from '@repo/client/mocks';
import { themes } from '@repo/uniwind/themes';
import type { Preview } from '@storybook/react-native';

const preview: Preview = {
  // Stories get tRPC fixtures from parameters.trpc through the mock link (ADR 0010).
  decorators: [withReusablesPreview, withTrpcMocks, withNavigationMocks],
  initialGlobals: { themeId: 'default', mode: 'light' },
  globalTypes: {
    themeId: {
      description: 'Interface theme',
      toolbar: {
        icon: 'paintbrush',
        dynamicTitle: true,
        items: themes.map(({ id, label }) => ({ value: id, title: label })),
      },
    },
    mode: {
      description: 'Appearance mode',
      toolbar: {
        icon: 'circlehollow',
        dynamicTitle: true,
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
