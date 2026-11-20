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

/*
 * The Vitest browser runner sets this global; the Storybook UI does not. The a11y addon runs axe after every story and,
 * at its default level, only warns, so under Vitest it costs a scan per test and fails nothing. The story tests
 * load test stories only, and the presentation stories, which cover every state, keep their axe results in the UI panel.
 */
const runsInVitest = '__vitest_browser__' in globalThis;

const preview: Preview = {
  // Every story file gets a Docs page; a file with nothing to document opts out with '!autodocs'.
  tags: ['autodocs'],
  decorators: [...previewDecorators, withDesktopSymbols],
  /*
   * Keep manager panels from turning desktop presentations into phone layouts.
   * Unlike story globals, this default leaves the viewport toolbar editable.
   */
  initialGlobals: { ...previewGlobals, viewport: { value: 'desktop' } },
  globalTypes: previewGlobalTypes,
  parameters: {
    ...previewParameters,
    a11y: { test: runsInVitest ? 'off' : 'todo' },
    standalonePreview: true,
    /*
     * Storybook reads `storySort` from this file without evaluating it, so it must stay an inline literal here:
     * not a constant, not spread in from `previewParameters`. Names that match no story yet (Foundations, Patterns)
     * are ignored, so later tickets need not touch this.
     */
    options: {
      storySort: {
        order: [
          'Design System',
          ['Foundations', 'Primitives', 'Patterns'],
          'Screens',
          ['Sessions', 'Settings', 'Onboarding', 'Plugins', '*'],
          '*',
          'Tests',
          ['Design System', 'Screens', '*'],
        ],
      },
    },
    viewport: {
      options: {
        desktop: {
          name: 'Desktop',
          type: 'desktop',
          styles: { width: '1440px', height: '900px' },
        },
        tablet: {
          name: 'Tablet',
          type: 'tablet',
          styles: { width: '1024px', height: '900px' },
        },
        phone: {
          name: 'Phone',
          type: 'mobile',
          styles: { width: '390px', height: '844px' },
        },
      },
    },
  },
};

export default preview;
