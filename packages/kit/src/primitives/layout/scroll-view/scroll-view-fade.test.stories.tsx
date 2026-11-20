import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, waitFor } from 'storybook/test';
import { ScrollFadeFrame } from '../../../scroll-fade/scroll-fade-frame-view';
import type { ScrollFadeOptions } from '../../../scroll-fade/scroll-fade-options';
import { ScrollView } from './scroll-view';

const meta = {
  title: 'Tests/Design System/Primitives/Layout/ScrollView/Fade',
  component: ScrollView,
} satisfies Meta<typeof ScrollView>;

export default meta;

type Story = StoryObj<typeof meta>;

const growContent = 'Grow content';

const growingContent = 'growing-content';

const growingScroll = 'growing-scroll';

function GrowingScroll({
  edges,
  virtualized,
}: Pick<ScrollFadeOptions, 'edges'> & { virtualized?: true }): ReactElement {
  const [height, setHeight] = useState(600);

  return (
    <>
      <button onClick={() => setHeight((value) => value + 40)}>
        {growContent}
      </button>
      <ScrollFadeFrame
        tracking={{}}
        depth={{ top: 28, bottom: 36, leading: 24, trailing: 24 }}
        edges={edges}
        virtualized={virtualized}
      >
        <div
          data-testid={growingScroll}
          style={{ height: 160, overflow: 'auto' }}
        >
          <div data-testid={growingContent} style={{ height }}>
            Streaming content
          </div>
        </div>
      </ScrollFadeFrame>
    </>
  );
}

export const KeepsPositionWhileContentGrows: Story = {
  render: () => <GrowingScroll />,
  play: async ({ canvas, userEvent }) => {
    const scroll = canvas.getByTestId(growingScroll);
    await waitFor(() => expect(scroll.scrollTop).toBe(0));
    scroll.scrollTop = 80;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(scroll.scrollTop).toBe(80));

    for (let step = 1; step <= 8; step++) {
      await userEvent.click(canvas.getByRole('button', { name: growContent }));
      await waitFor(() =>
        expect(canvas.getByTestId(growingContent).clientHeight).toBe(
          600 + step * 40,
        ),
      );
      await expect(scroll.scrollTop).toBe(80);
    }

    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() =>
      expect(scroll.scrollTop + scroll.clientHeight).toBe(scroll.scrollHeight),
    );
    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(scroll.scrollTop).toBe(0));
  },
};

function renderedMask(scroll: HTMLElement): string {
  const frame = scroll.closest('.scroll-fade');
  const surface = frame?.firstElementChild;

  if (!surface) throw new Error('Expected a masked scroll surface');

  return getComputedStyle(surface).maskImage;
}

export const VirtualizedFadeTracksContentSize: Story = {
  render: () => <GrowingScroll virtualized />,
  play: async ({ canvas, userEvent }) => {
    const scroll = canvas.getByTestId(growingScroll);
    const startMask = renderedMask(scroll);
    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(renderedMask(scroll)).not.toBe(startMask));
    const endMask = renderedMask(scroll);

    await userEvent.click(canvas.getByRole('button', { name: growContent }));
    await waitFor(() => expect(renderedMask(scroll)).not.toBe(endMask));
  },
};

export const FixedEndFadeSurvivesContentGrowth: Story = {
  render: () => <GrowingScroll virtualized edges={{ bottom: 'always' }} />,
  play: async ({ canvas, userEvent }) => {
    const scroll = canvas.getByTestId(growingScroll);
    const startMask = renderedMask(scroll);
    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(renderedMask(scroll)).not.toBe(startMask));
    const endMask = renderedMask(scroll);

    await userEvent.click(canvas.getByRole('button', { name: growContent }));
    await expect(canvas.getByTestId(growingContent)).toHaveStyle({
      height: '640px',
    });
    await expect(renderedMask(scroll)).toBe(endMask);
  },
};
