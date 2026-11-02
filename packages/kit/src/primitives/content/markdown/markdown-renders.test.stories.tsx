import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Profiler, useState } from 'react';
import { Pressable, View } from 'react-native';
import { expect } from 'storybook/test';
import { renderCounter } from '../../../../mocks/render-counts';
import { Markdown } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Content/Markdown/Renders',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const text = '# Overview\n\nA paragraph.\n\n1. First item\n2. Second item';

const renders = renderCounter();

function MountsMarkdown(): React.JSX.Element {
  const [shown, setShown] = useState(false);

  return (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <Pressable testID="show" onPress={() => setShown(true)}>
        <View>{shown && <Markdown text={text} />}</View>
      </Pressable>
    </Profiler>
  );
}

const nextFrame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

const drawnOnce = ['Prose', 'ListMarker', 'MarkdownClamp'];

export const UnclampedMessageDrawsOnce: Story = {
  render: () => <MountsMarkdown />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const show = await canvas.findByTestId('show');

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(show);
      await canvas.findByText('A paragraph.');
      // A layout event or a layout effect's state lands by then.
      await nextFrame();
      await nextFrame();
    });

    await expect(counts.Prose?.mounts).toBeGreaterThan(0);
    await expect(
      drawnOnce.flatMap((name) => counts[name]?.updates ?? []),
    ).toEqual([]);
  },
};
