import {
  previewDecorators,
  previewGlobals,
  previewGlobalTypes,
  previewParameters,
  type RenderSymbolImage,
  SymbolImagesProvider,
} from '@repo/client/storybook';
import type { Decorator, Preview } from '@storybook/react-native-web-vite';
import '../global.css';

declare global {
  interface Window {
    // Set by the desktop preload in `pnpm storybook:mac`; a browser has none.
    argo?: { symbols?: { render: RenderSymbolImage } };
  }
}

/*
 * In the macOS Storybook window, icons draw SF Symbols as the desktop app does; in a browser, Material Symbols.
 * Stories run in the preview iframe, but Electron runs the preload only in the top frame, the same-origin manager.
 */
const desktopBridge = globalThis.window?.argo ?? globalThis.window?.parent.argo;
const renderSymbolImage = desktopBridge?.symbols?.render;

const withDesktopSymbols: Decorator = (Story) => (
  <SymbolImagesProvider render={renderSymbolImage}>
    <Story />
  </SymbolImagesProvider>
);

const preview: Preview = {
  decorators: [...previewDecorators, withDesktopSymbols],
  initialGlobals: previewGlobals,
  globalTypes: previewGlobalTypes,
  parameters: { ...previewParameters, standalonePreview: true },
};

export default preview;
