import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { GrowingCards, arrivingCopy } from './card-growth.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Card/Growth',
  parameters: { screenPreview: true },
  render: (): ReactElement => <GrowingCards />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

function seekNearEnd(animation: Animation): void {
  const effect = animation.effect;

  if (!effect) throw new Error('The content animation must have an effect');

  const timing = effect.getComputedTiming();

  if (typeof timing.duration !== 'number')
    throw new Error('The content animation must have a finite duration');

  animation.pause();
  animation.currentTime = timing.duration - 1;
}

function pauseAnimations(): void {
  for (const animation of document.getAnimations()) animation.pause();
}

// Newly loaded content must be part of the animated target, rather than snapping into place at the end.
export const ContentArrivesWhileOpening: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const trigger = canvas.getByRole('button', { name: 'Expand First' });
    const neighbour = canvas.getByRole('button', { name: 'Collapse Second' });

    const initial = trigger.getBoundingClientRect();

    trigger.click();
    await waitFor(() =>
      expect(document.getAnimations().length).toBeGreaterThan(0),
    );
    pauseAnimations();
    await userEvent.click(canvas.getByRole('button', { name: 'Load content' }));
    await expect(canvas.getByText(arrivingCopy.trim())).toBeInTheDocument();
    await nextFrame();
    await nextFrame();
    const animations = document.getAnimations();

    await expect(animations.length).toBeGreaterThan(0);

    for (const animation of animations) seekNearEnd(animation);

    const before = neighbour.getBoundingClientRect().top;

    for (const animation of animations) animation.finish();
    await nextFrame();
    const after = neighbour.getBoundingClientRect().top;

    await expect(Math.abs(after - before)).toBeLessThan(1);
    await expect(trigger.getBoundingClientRect().top).toBe(initial.top);
    await expect(trigger.getBoundingClientRect().width).toBe(initial.width);
  },
};
