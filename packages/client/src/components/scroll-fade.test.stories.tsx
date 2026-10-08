import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { expectFadeColor } from '../../mocks/fade-color';
import { ScrollFadePreview } from '../../mocks/scroll-fade-preview';
import { ScrollFadeView } from './scroll-fade';

const bottomFadeId = 'scroll-fade-bottom';
const topFadeId = 'scroll-fade-top';

const meta = {
  title: 'Tests/ScrollFade',
  component: ScrollFadeView,
} satisfies Meta<typeof ScrollFadeView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const FadesFollowScroll: Story = {
  render: () => <ScrollFadePreview />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('scroll-fade-scroll');
    // At rest only the bottom edge hides content.
    await waitFor(() => expect(canvas.getByTestId(bottomFadeId)).toBeVisible());
    expect(canvas.queryByTestId(topFadeId)).toBeNull();
    scroll.scrollTop = 120;
    const top = await canvas.findByTestId(topFadeId);
    const header = canvas.getByText('pnpm dev');
    // The fade starts where the header ends, so content fades under it.
    expect(top.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      header.getBoundingClientRect().bottom,
    );
    expect(getComputedStyle(top).pointerEvents).toBe('none');
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(canvas.queryByTestId(bottomFadeId)).toBeNull());
    scroll.scrollTop = 0;
    await waitFor(() => expect(canvas.queryByTestId(topFadeId)).toBeNull());
  },
};

export const FadesMatchSurface: Story = {
  render: () => <ScrollFadePreview />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('scroll-fade-scroll');
    scroll.scrollTop = 120;
    const top = await canvas.findByTestId(topFadeId);
    await expectFadeColor(top);
  },
};

export const NoFadeWhenContentFits: Story = {
  render: () => <ScrollFadePreview lines={['Starting Metro Bundler']} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Starting Metro Bundler');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(canvas.queryByTestId(topFadeId)).toBeNull();
    expect(canvas.queryByTestId(bottomFadeId)).toBeNull();
  },
};
