import type { StoryObj } from '@storybook/react-native-web-vite';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import type { Screen } from './screen';

type ScreenStory = StoryObj<typeof Screen>;

// Screen draws its own heading at every width in a story, which has no navigator; each claim runs at the widths it names.
export const screenWidths = {
  Phone: layoutWidths.phone,
  Tablet: layoutWidths.tablet,
  Wide: layoutWidths.wide,
} as const;

// The story at one viewport width, settled before it renders.
export function atWidth(width: number, story: ScreenStory): ScreenStory {
  return { ...story, beforeEach: () => settleLayout(width) };
}
