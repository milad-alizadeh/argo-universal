import { themes } from '@repo/uniwind/themes';
import { withNavigationMocks } from './with-navigation-mocks';
import { withReusablesPreview } from './with-theme';
import { withTrpcMocks } from './with-trpc-mocks';

// Stories get tRPC fixtures from parameters.trpc through the mock link (ADR 0010).
export const previewDecorators = [
  withReusablesPreview,
  withTrpcMocks,
  withNavigationMocks,
];

export const previewGlobals = { themeId: 'default', mode: 'light' };

export const previewGlobalTypes = {
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
};

export const previewParameters = {
  layout: 'fullscreen',
  backgrounds: { disable: true },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/i,
    },
  },
};
