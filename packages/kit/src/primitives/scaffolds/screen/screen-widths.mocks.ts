import type { StoryObj } from '@storybook/react-native-web-vite';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import type { Screen } from './screen';

type ScreenStory = StoryObj<typeof Screen>;

// Screen draws its own heading at both widths in a story, which has no navigator; each claim runs at both.
export const screenWidths = {
  Phone: layoutWidths.phone,
  Wide: layoutWidths.wide,
} as const;

// The story at one viewport width, settled before it renders.
export function atWidth(width: number, story: ScreenStory): ScreenStory {
  return { ...story, beforeEach: () => settleViewport(width) };
}
