import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  RichTextareaExample,
  shownText,
} from '../../../../../../mocks/rich-textarea-example';

// A draft that arrives from outside, drawn by the web drawing (Lexical) with its blocks.

const meta = {
  title: 'Tests/RichTextareaShownBlocks',
  component: RichTextareaExample,
  args: { onChangeText: fn() },
} satisfies Meta<typeof RichTextareaExample>;
export default meta;
type Story = StoryObj<typeof meta>;

const label = 'Message';

// A restored draft draws its blocks, nested lists included, without sending a change.
export const ShowsNestedLists: Story = {
  args: {
    initialValue:
      '- Plan\n    - Draft\n        - Outline\n- Ship\n\n1. Build\n    1. Test\n2. Release',
  },
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await expect(canvas.getAllByRole('list')).toHaveLength(5);
    await expect(shownText(field)).toBe(
      'Plan\nDraft\nOutline\nShip\nBuild\nTest\nRelease',
    );
    await expect(args.onChangeText).not.toHaveBeenCalled();
  },
};

function shownBlock(initialValue: string, role: string, text: string): Story {
  return {
    args: { initialValue },
    play: async ({ canvas, args }) => {
      await expect(canvas.getByRole(role)).toHaveTextContent(text);
      await expect(args.onChangeText).not.toHaveBeenCalled();
    },
  };
}
export const ShowsAQuote = shownBlock(
  '> Keep the phone readable.\n> Use both themes.',
  'blockquote',
  'Keep the phone readable.Use both themes.',
);
export const ShowsACodeBlock = shownBlock(
  '```ts\nconst snake_case = 2 * 3;\n```',
  'code',
  'const snake_case = 2 * 3;',
);
