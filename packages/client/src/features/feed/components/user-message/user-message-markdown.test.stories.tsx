import { layoutWidths } from '@repo/kit/each-layout';
import { canPointAt, centreOf } from '@repo/kit/mocks/point-hit';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  type MockAgent,
  recordedImageUrl,
  recordedPrompt,
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
    row: recordedPrompt('agent-1', markdownPrompt),
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof UserMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each markdown source in the recorded prompt and the text it draws once its markers are gone.
const drawn = [
  { source: '**Composer**', text: 'Composer' },
  { source: '*care*', text: 'care' },
  { source: '~~skip the docs~~', text: 'skip the docs' },
  { source: '`draftPrompt`', text: 'draftPrompt' },
  { source: '\n1. Read', text: '1.' },
  { source: '\n2. Run', text: '2.' },
  { source: '    - unit', text: 'unit' },
  { source: '    - e2e', text: 'e2e' },
  {
    source: '> The stored text stays exactly as typed.',
    text: 'The stored text stays exactly as typed.',
  },
] as const;

// Syntax colours split the fence into spans, so it is found as a block and read whole, not as one text node.
const fence = {
  source: '```ts\nconst text = draft.text;\n```',
  text: 'const text = draft.text;',
} as const;

const link = { source: '[ADR-0023](', name: 'ADR-0023' } as const;

const promptText = recordedPrompt('agent-1', markdownPrompt)
  .content.flatMap((block) => (block.type === 'text' ? [block.text] : []))
  .join('');

for (const { source } of [...drawn, fence, link])
  if (!promptText.includes(source))
    throw new Error(`Recorded catalog needs ${source} in the markdown prompt`);

async function showsWhenExpanded(element: HTMLElement): Promise<void> {
  element.scrollIntoView({ block: 'center' });

  await waitFor(() => expect(isUncovered(element)).toBe(true));
}

// Whether a person can see and point at the element's first line, rather than it being hidden by the clamp.
function isUncovered(element: HTMLElement): boolean {
  const firstLine = element.getClientRects()[0];

  return firstLine !== undefined && canPointAt(element, centreOf(firstLine));
}

// The clamp hides the code block; expanded, every mark, list, quote, link and code block draws without its markers.
function rendersMarkdown(agent: MockAgent, width: number): Story {
  return {
    args: { row: recordedPrompt(agent, markdownPrompt) },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const code = canvas.getByTestId('code-text');
      await expect(code).toHaveTextContent(fence.text);
      await expect(isUncovered(code)).toBe(false);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Show more' }),
      );

      for (const { text } of drawn)
        await showsWhenExpanded(canvas.getByText(text, { exact: true }));

      await showsWhenExpanded(code);
      await expect(canvas.getByRole('link', { name: link.name })).toBeVisible();
      await expect(canvas.queryByText(/\*\*|~~|```|^> /)).toBeNull();
    },
  };
}

export const FirstAgentPhone = rendersMarkdown('agent-1', layoutWidths.phone);

export const FirstAgentWide = rendersMarkdown('agent-1', layoutWidths.wide);

export const SecondAgentPhone = rendersMarkdown('agent-2', layoutWidths.phone);

export const SecondAgentWide = rendersMarkdown('agent-2', layoutWidths.wide);
