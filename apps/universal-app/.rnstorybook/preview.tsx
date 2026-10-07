import {
  previewDecorators,
  previewGlobals,
  previewGlobalTypes,
  previewParameters,
} from '@repo/client/mocks';
import type { Preview } from '@storybook/react-native';

const preview: Preview = {
  decorators: previewDecorators,
  initialGlobals: previewGlobals,
  globalTypes: previewGlobalTypes,
  parameters: previewParameters,
};

export default preview;
