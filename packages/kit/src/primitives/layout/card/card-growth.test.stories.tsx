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

function heightTransition(card: HTMLElement): Animation {
  const transition = card
    .getAnimations({ subtree: true })
    .find(
      (animation) =>
        animation instanceof CSSTransition &&
        animation.transitionProperty === 'height',
    );

  if (!transition) throw new Error('The Card height must be transitioning');

  return transition;
}

function retargetedHeight(card: HTMLElement, opening: Animation): Animation {
  const transition = heightTransition(card);

  if (transition === opening)
    throw new Error('The height transition must include the loaded content');

  return transition;
}

// Newly loaded content must be part of the animated target, rather than snapping into place at the end.
export const ContentArrivesWhileOpening: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const trigger = canvas.getByRole('button', { name: 'Expand First' });
    const neighbour = canvas.getByRole('button', { name: 'Collapse Second' });
    const card = canvas.getByRole('group', { name: 'First' });

    const initial = trigger.getBoundingClientRect();

    trigger.click();
    const opening = await waitFor(() => heightTransition(card));
    opening.pause();
    await userEvent.click(canvas.getByRole('button', { name: 'Load content' }));
    await expect(canvas.getByText(arrivingCopy.trim())).toBeInTheDocument();
    const grown = await waitFor(() => retargetedHeight(card, opening));

    seekNearEnd(grown);

    const before = neighbour.getBoundingClientRect().top;

    grown.finish();
    await nextFrame();
    const after = neighbour.getBoundingClientRect().top;

    await expect(Math.abs(after - before)).toBeLessThan(1);
    await expect(
      canvas.getByText(arrivingCopy.trim()).getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(card.getBoundingClientRect().bottom);
    await expect(trigger.getBoundingClientRect().top).toBe(initial.top);
    await expect(trigger.getBoundingClientRect().width).toBe(initial.width);
  },
};

// Content that changes in a card already open and at rest, as another Session's does, takes its height at once.
export const ContentChangesAtRest: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const card = canvas.getByRole('group', { name: 'First' });

    canvas.getByRole('button', { name: 'Expand First' }).click();
    await waitFor(() =>
      expect(card.getAnimations({ subtree: true }).length).toBeGreaterThan(0),
    );
    await Promise.all(
      card.getAnimations({ subtree: true }).map(({ finished }) => finished),
    );
    await nextFrame();
    await userEvent.click(canvas.getByRole('button', { name: 'Load content' }));
    await expect(canvas.getByText(arrivingCopy.trim())).toBeInTheDocument();
    await nextFrame();
    await nextFrame();

    await expect(card.getAnimations({ subtree: true })).toHaveLength(0);
    await expect(
      canvas.getByText(arrivingCopy.trim()).getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(card.getBoundingClientRect().bottom);
  },
};
