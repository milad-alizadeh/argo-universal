import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { ScrollFadePreview } from '../../mocks/scroll-fade-preview';
import { ScrollFadeView } from './ScrollFade';

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
    await waitFor(() =>
      expect(canvas.getByTestId('scroll-fade-bottom')).toBeVisible(),
    );
    expect(canvas.queryByTestId('scroll-fade-top')).toBeNull();
    scroll.scrollTop = 120;
    const top = await canvas.findByTestId('scroll-fade-top');
    const header = canvas.getByText('pnpm dev');
    // The fade starts where the header ends, so content fades under it.
    expect(top.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      header.getBoundingClientRect().bottom,
    );
    expect(getComputedStyle(top).pointerEvents).toBe('none');
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() =>
      expect(canvas.queryByTestId('scroll-fade-bottom')).toBeNull(),
    );
    scroll.scrollTop = 0;
    await waitFor(() =>
      expect(canvas.queryByTestId('scroll-fade-top')).toBeNull(),
    );
  },
};

export const FadesMatchSurface: Story = {
  render: () => <ScrollFadePreview />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('scroll-fade-scroll');
    scroll.scrollTop = 120;
    const top = await canvas.findByTestId('scroll-fade-top');
    const surface = scroll.closest('.bg-sidebar') ?? scroll.parentElement;
    if (!surface) throw new Error('Missing panel surface');
    const surfaceColor = getComputedStyle(surface).backgroundColor;
    const stops = top.querySelectorAll('stop');
    expect(stops.length).toBe(3);
    const probe = document.createElement('div');
    document.body.append(probe);
    for (const stop of stops) {
      probe.style.color = stop.getAttribute('stop-color') ?? '';
      expect(getComputedStyle(probe).color).toBe(surfaceColor);
    }
    probe.remove();
  },
};

export const NoFadeWhenContentFits: Story = {
  render: () => <ScrollFadePreview lines={['Starting Metro Bundler']} />,
  play: async ({ canvas }) => {
    await canvas.findByText('Starting Metro Bundler');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(canvas.queryByTestId('scroll-fade-top')).toBeNull();
    expect(canvas.queryByTestId('scroll-fade-bottom')).toBeNull();
  },
};
