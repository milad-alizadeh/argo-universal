import { layoutWidths } from '@repo/kit/each-layout';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { ResourceCode as FeedCodeBlock } from '@repo/kit/primitives/content/code';
import { Text } from '@repo/kit/primitives/content/text';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { expect } from 'storybook/test';

const firstLine = "import { CACHE } from './headers';";

const secondLine = 'export const noStore = () => CACHE;';

/*
 * An Agent writes a fence a piece at a time, so the block is drawn over and over with code that
 * keeps growing. Colouring is held between those renders, and has to follow the code when it moves.
 */
function GrowingCode(): React.JSX.Element {
  const [lines, setLines] = useState([firstLine]);

  return (
    <>
      <Pressable
        role="button"
        onPress={() => setLines([firstLine, secondLine])}
      >
        <Text>Write more</Text>
      </Pressable>
      <FeedCodeBlock code={lines.join('\n')} language="ts" />
    </>
  );
}

const meta = {
  title: 'Tests/StreamingCode',
  component: GrowingCode,
} satisfies Meta<typeof GrowingCode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FollowsCodeAsItArrives: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const code = canvas.getByTestId('code-text');

    await expect(code).toHaveTextContent(firstLine);
    await expect(code.textContent).not.toContain(secondLine);

    await userEvent.click(canvas.getByRole('button', { name: 'Write more' }));

    await expect(canvas.getByTestId('code-text').textContent).toBe(
      `${firstLine}\n${secondLine}`,
    );
  },
};
