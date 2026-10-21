import type { StoryObj } from '@storybook/react-native-web-vite';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import type { Page } from './page';

type PageStory = StoryObj<typeof Page>;

// Page draws its own heading at both widths in a story, which has no navigator; each claim runs at both.
export const pageWidths = {
  Phone: layoutWidths.phone,
  Wide: layoutWidths.wide,
} as const;

// The story at one viewport width, settled before it renders.
export function atWidth(width: number, story: PageStory): PageStory {
  return { ...story, beforeEach: () => settleViewport(width) };
}
