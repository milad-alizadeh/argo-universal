import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, waitFor } from 'storybook/test';
import { ScrollFadeFrame } from '../../../scroll-fade/scroll-fade-frame-view';
import { ScrollView } from './scroll-view';

const meta = {
  title: 'Tests/Design System/Primitives/Layout/ScrollView/Fade',
  component: ScrollView,
} satisfies Meta<typeof ScrollView>;

export default meta;

type Story = StoryObj<typeof meta>;

function GrowingScroll(): ReactElement {
  const [height, setHeight] = useState(600);

  return (
    <>
      <button onClick={() => setHeight((value) => value + 40)}>
        Grow content
      </button>
      <ScrollFadeFrame
        tracking={{}}
        depth={{ top: 28, bottom: 36, leading: 24, trailing: 24 }}
      >
        <div
          data-testid="growing-scroll"
          style={{ height: 160, overflow: 'auto' }}
        >
          <div data-testid="growing-content" style={{ height }}>
            Streaming content
          </div>
        </div>
      </ScrollFadeFrame>
    </>
  );
}

const depth = (scroll: HTMLElement, edge: string): number =>
  Number.parseFloat(
    getComputedStyle(scroll).getPropertyValue(`--scroll-fade-${edge}`),
  );

export const KeepsFadeWhileContentGrows: Story = {
  render: () => <GrowingScroll />,
  play: async ({ canvas, userEvent }) => {
    const scroll = canvas.getByTestId('growing-scroll');
    await waitFor(() => expect(depth(scroll, 'top')).toBe(0));
    scroll.scrollTop = 80;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(depth(scroll, 'top')).toBe(28));

    for (let step = 1; step <= 8; step++) {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Grow content' }),
      );
      await waitFor(() =>
        expect(canvas.getByTestId('growing-content').clientHeight).toBe(
          600 + step * 40,
        ),
      );
      await expect(depth(scroll, 'top')).toBe(28);
      await expect(depth(scroll, 'bottom')).toBe(36);
    }

    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(depth(scroll, 'bottom')).toBe(0));
    scroll.scrollTop = 0;
    scroll.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(depth(scroll, 'top')).toBe(0));
  },
};
