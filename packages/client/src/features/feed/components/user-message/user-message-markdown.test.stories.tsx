import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  type MockAgent,
  recordedImageUrl,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { UserMessage } from './user-message';

const markdownPrompt = 'markdown-prompt';

const meta = {
  title: 'Tests/UserMessageMarkdown',
  globals: { mode: 'light' },
  component: UserMessage,
  // The Feed gives every row its full width.
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
  args: {
    row: recordedUserMessage('agent-1', markdownPrompt),
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof UserMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

const markdownPromptText = recordedUserMessage('agent-1', markdownPrompt)
  .content.flatMap((block) => (block.type === 'text' ? [block.text] : []))
  .join('');
for (const fact of [
  '**Composer**',
  '*care*',
  '~~skip the docs~~',
  '[ADR-0023](',
  '1. ',
  '    - unit',
  '> ',
  '```ts',
])
  if (!markdownPromptText.includes(fact))
    throw new Error(`Recorded catalog needs ${fact} in the markdown prompt`);

// Whether a person can see and point at the element, rather than it being hidden by the clamp.
function isUncovered(element: HTMLElement): boolean {
  const { left, top, width, height } = element.getBoundingClientRect();
  const hit = document.elementFromPoint(left + width / 2, top + height / 2);
  return hit !== null && element.contains(hit);
}

function rendersMarkdown(agent: MockAgent, width: number): Story {
  return {
    args: { row: recordedUserMessage(agent, markdownPrompt) },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Show more' }),
      );
      for (const text of [
        'Composer',
        'care',
        'skip the docs',
        'draftPrompt',
        '1.',
        '2.',
        'unit',
        'e2e',
        'The stored text stays exactly as typed.',
        'const text = draft.text;',
      ]) {
        const element = canvas.getByText(text, { exact: true });
        element.scrollIntoView({ block: 'center' });
        await expect(element).toBeVisible();
      }
      await expect(
        canvas.getByRole('link', { name: 'ADR-0023' }),
      ).toBeVisible();
      await expect(canvas.queryByText(/\*\*|~~|```|^> /)).toBeNull();
    },
  };
}
export const FirstAgentPhone = rendersMarkdown('agent-1', layoutWidths.phone);
export const FirstAgentWide = rendersMarkdown('agent-1', layoutWidths.wide);
export const SecondAgentPhone = rendersMarkdown('agent-2', layoutWidths.phone);
export const SecondAgentWide = rendersMarkdown('agent-2', layoutWidths.wide);

// The prompt clamps to four lines, hiding its code block until expanded.
export const ShowMore: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const code = canvas.getByText('const text = draft.text;', { exact: true });
    await expect(isUncovered(code)).toBe(false);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Show more' }),
    );
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    code.scrollIntoView({ block: 'center' });
    await waitFor(() => expect(isUncovered(code)).toBe(true));
  },
};
