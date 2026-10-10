import { withNavigationMocks } from '../mocks/with-navigation-mocks';
import { withTrpcMocks } from '../mocks/with-trpc-mocks';
import { withReusablesPreview } from './with-theme';

// Stories get tRPC fixtures from parameters.trpc through the mock link (ADR 0010).
export const previewDecorators = [
  withReusablesPreview,
  withTrpcMocks,
  withNavigationMocks,
];

export const previewGlobals = { mode: 'light' };

export const previewGlobalTypes = {
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
