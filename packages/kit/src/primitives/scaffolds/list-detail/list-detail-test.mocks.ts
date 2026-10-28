import type { StoryObj } from '@storybook/react-native-web-vite';
import { settleLayout } from '#mocks/story-layout';
import type { ListDetail } from './list-detail';

export type Story = StoryObj<typeof ListDetail>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

export const row = (canvas: Canvas, title: string): HTMLElement =>
  canvas.getByRole('button', { name: new RegExp(title) });

export const heading = (canvas: Canvas, name: string): Promise<HTMLElement> =>
  canvas.findByRole('heading', { name });

// The story at one viewport width, settled before it renders.
export const at = (width: number, story: Story): Story => ({
  ...story,
  beforeEach: () => settleLayout(width),
});
