import {
  previewDecorators,
  previewGlobals,
  previewGlobalTypes,
  previewParameters,
} from '@repo/client/mocks';
import type { Preview } from '@storybook/react-native-web-vite';
import '../global.css';

const preview: Preview = {
  decorators: previewDecorators,
  initialGlobals: previewGlobals,
  globalTypes: previewGlobalTypes,
  parameters: { ...previewParameters, standalonePreview: true },
};

export default preview;
