import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { cdp } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { sampleEachFrame } from '../../../../mocks/sample-each-frame';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from './collapsible';

const toggle = 'Toggle motion';

const body = 'Content retained while moving';

const following = 'Following row';

const insideAction = fn();

function MotionDisclosure({ forceMount }: { forceMount?: true }): ReactElement {
  return (
    <View>
      <Collapsible defaultOpen>
        <CollapsibleHeader label={toggle} />
        <CollapsibleContent forceMount={forceMount}>
          <Text>{body}</Text>
          <Button label="Inside action" onPress={insideAction} />
        </CollapsibleContent>
      </Collapsible>
      <Text>{following}</Text>
    </View>
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Collapsible/Motion',
  parameters: { screenPreview: true },
  render: (): ReactElement => <MotionDisclosure />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReducedMotionClosesInOneStep: Story = {
  beforeEach: async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    return async (): Promise<void> => {
      await cdp().send('Emulation.setEmulatedMedia', { features: [] });
    };
  },
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const trigger = canvas.getByRole('button', { name: toggle });
    const below = canvas.getByText(following);
    const before = below.getBoundingClientRect().top;

    const samples = await sampleEachFrame(
      () => trigger.click(),
      () => below.getBoundingClientRect().top,
      5,
    );

    await expect(new Set(samples).size).toBe(1);
    await expect(samples[0]).toBeLessThan(before);
    await waitFor(() =>
      expect(canvas.queryByText(body)).not.toBeInTheDocument(),
    );
  },
};

export const RapidReversalKeepsOpenContent: Story = {
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const trigger = canvas.getByRole('button', { name: toggle });

    trigger.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const samples = await sampleEachFrame(
      () => trigger.click(),
      () => Number(canvas.queryByText(body) !== null),
      40,
    );

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(samples).toEqual(Array.from({ length: 40 }, () => 1));
    await expect(canvas.getByText(body)).toBeVisible();
  },
};

export const ForcedContentStaysMountedButInaccessibleWhenClosed: Story = {
  render: (): ReactElement => <MotionDisclosure forceMount />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const trigger = canvas.getByRole('button', { name: toggle });

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText(body)).toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Inside action' }),
    ).toBeNull();
    await userEvent.click(trigger);
    await expect(
      canvas.getByRole('button', { name: 'Inside action' }),
    ).toBeVisible();
  },
};

const shrink = 'Shrink content';

function ShrinkingDisclosure(): ReactElement {
  const [tall, setTall] = useState(true);

  return (
    <View>
      <Button label={shrink} onPress={() => setTall(false)} />
      <Collapsible>
        <CollapsibleHeader label={toggle} />
        <CollapsibleContent>
          <View className={tall ? 'h-64' : 'h-16'} />
        </CollapsibleContent>
      </Collapsible>
      <Text>{following}</Text>
    </View>
  );
}

// Content that shrinks while it opens takes the row below no further than where it ends, and the row rests there once.
export const ShrinkingWhileOpeningNeverPassesTheEnd: Story = {
  render: (): ReactElement => <ShrinkingDisclosure />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const trigger = canvas.getByRole('button', { name: toggle });
    const below = canvas.getByText(following);

    trigger.click();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );

    const tops = await sampleEachFrame(
      () => canvas.getByRole('button', { name: shrink }).click(),
      () => below.getBoundingClientRect().top,
      40,
    );

    const end = tops.at(-1) ?? 0;
    const rest = tops.indexOf(end);

    await expect(Math.max(...tops)).toBeLessThanOrEqual(end);
    await expect(tops.slice(rest)).toEqual(tops.slice(rest).map(() => end));
  },
};
