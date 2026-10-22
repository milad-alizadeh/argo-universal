import type { Preview } from '@storybook/react-native-web-vite';
import { withArgoPreview } from './with-theme';

// The macOS Storybook window passes the desktop preload's SF Symbol renderer through this.
export {
  type RenderSymbolImage,
  SymbolImagesProvider,
} from '@repo/kit/symbols/symbol-images';

// Stories render views from props (ADR-0021); no decorator serves data.
export const previewDecorators = [withArgoPreview];

export const previewGlobals = { mode: 'light' };

/* Annotated, so Storybook's own toolbar-icon names type the literal below. */
export const previewGlobalTypes: NonNullable<Preview['globalTypes']> = {
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
