import { withNavigationMocks } from '../mocks/with-navigation-mocks';
import { withReusablesPreview } from './with-theme';

// Stories render views from props (ADR-0021); no decorator serves data.
export const previewDecorators = [withReusablesPreview, withNavigationMocks];

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
