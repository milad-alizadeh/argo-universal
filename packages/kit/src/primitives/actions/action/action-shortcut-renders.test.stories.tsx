import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { memo, Profiler, useState } from 'react';
import { expect } from 'storybook/test';
import { nextFrames } from '#mocks/next-frames';
import { renderCounter, type RenderCounts } from '#mocks/render-counts';
import { settleLayout } from '#mocks/story-layout';
import { Button } from '#primitives/actions/button';
import { Action, ActionShortcutScope, ContextActions } from './index';

const meta = {
  title: 'Tests/Design System/Primitives/Actions/Action/ShortcutRenders',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const keys = ['a', 'b', 'c', 'd'] as const;

const actionsOf = Object.fromEntries(
  keys.map((key) => [
    key,
    <Action
      key={key}
      label={`Act ${key}`}
      icon="archive"
      shortcut={{ modifiers: ['alt'], key }}
      onPress={() => {}}
    />,
  ]),
);

// Each row draws only when its own props change, as a List's rows do.
const ShortcutRow = memo(function ShortcutRow({ name }: { name: string }) {
  return (
    <ContextActions actions={actionsOf[name]}>
      <Button label={`Row ${name}`} />
    </ContextActions>
  );
});

const renders = renderCounter('shortcut-rows');

function GrowingRows(): React.JSX.Element {
  const [count, setCount] = useState(3);

  return (
    <ActionShortcutScope>
      <Button label="Add row" onPress={() => setCount(count + 1)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        {keys.slice(0, count).map((name) => (
          <ShortcutRow key={name} name={name} />
        ))}
      </Profiler>
    </ActionShortcutScope>
  );
}

const updatesOf = (counts: RenderCounts, name: string): number =>
  counts[name]?.updates.length ?? 0;

// A row that registers its shortcuts hands keys out again, and only a row whose keys changed draws again.
export const NewRowLeavesSiblingsAlone: Story = {
  render: () => <GrowingRows />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await nextFrames();

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Add row' }));
      await expect(await canvas.findByText('Row d')).toBeVisible();
      await nextFrames();
    });

    await expect(counts.ShortcutRow).toHaveProperty('mounts', 1);
    // The new row's own declaration may draw again once its keys are handed out.
    await expect(updatesOf(counts, 'ContextActions')).toBeLessThanOrEqual(1);
  },
};
