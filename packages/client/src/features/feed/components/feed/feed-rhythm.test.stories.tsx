import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { ArrivingPrompt, rhythmText } from './feed-rhythm.mocks';

const meta = {
  title: 'Tests/Feed/Rhythm',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => <ArrivingPrompt />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function arrivingPrompt(layout: 'phone' | 'wide'): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleLayout(layout);
      const first = await canvas.findByText(rhythmText.firstUser);
      const answer = await canvas.findByText(rhythmText.agent);
      await userEvent.click(canvas.getByRole('button', { name: 'Send next' }));
      const next = await canvas.findByText(rhythmText.nextUser);
      await waitFor(async () => {
        const before =
          answer.getBoundingClientRect().top -
          first.getBoundingClientRect().bottom;

        const after =
          next.getBoundingClientRect().top -
          answer.getBoundingClientRect().bottom;

        await expect(before).toBeGreaterThan(20);
        await expect(
          Math.abs(after - before),
          JSON.stringify({ layout, before, after }),
        ).toBeLessThan(2);
      });
    },
  };
}

export const ArrivingPromptOnPhone = arrivingPrompt('phone');

export const ArrivingPromptOnDesktop = arrivingPrompt('wide');
