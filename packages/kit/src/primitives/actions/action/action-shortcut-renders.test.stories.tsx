import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { isValidElement, memo, Profiler, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { PluginTreeContext } from '#kit/plugin-tree-context';
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

// A row's Action; `held` is the key it asks for, which another row may already hold.
const actionOf = (name: string, held: string): React.JSX.Element => (
  <Action
    key={name}
    label={`Act ${name}`}
    icon="archive"
    shortcut={{ modifiers: ['alt'], key: held }}
    onPress={() => {}}
  />
);

const actionsOf = Object.fromEntries([
  ...keys.map((key) => [key, actionOf(key, key)]),
  // The newest row asks for the key row a holds.
  ['dup', actionOf('dup', 'a')],
]);

// Each row draws only when its own props change, as a List's rows do.
const ShortcutRow = memo(function ShortcutRow({ name }: { name: string }) {
  return (
    <ContextActions actions={actionsOf[name]}>
      <Button label={`Row ${name}`} />
    </ContextActions>
  );
});

const renders = renderCounter('shortcut-rows');

// `plugin` draws the rows as a Plugin's, whose declarations never share a key.
function GrowingRows({
  added,
  plugin = false,
}: {
  added: string;
  plugin?: boolean;
}): React.JSX.Element {
  const [grown, setGrown] = useState(false);
  const names = [...keys.slice(0, 3), ...(grown ? [added] : [])];

  return (
    <ActionShortcutScope>
      <Button label="Add row" onPress={() => setGrown(true)} />
      <Profiler id={renders.id} onRender={renders.onRender}>
        <PluginTreeContext value={plugin}>
          {names.map((name) => (
            <ShortcutRow key={name} name={name} />
          ))}
        </PluginTreeContext>
      </Profiler>
    </ActionShortcutScope>
  );
}

// The row each update of `name` drew, by the key of the Actions it was given.
const updatedRows = (counts: RenderCounts, name: string): unknown[] =>
  (counts[name]?.updates ?? []).map((props) =>
    'actions' in props && isValidElement(props.actions)
      ? props.actions.key
      : undefined,
  );

// A row that registers its shortcuts hands keys out again, and only a row whose keys changed draws again.
export const NewRowLeavesSiblingsAlone: Story = {
  render: () => <GrowingRows added="d" />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await nextFrames();

    const counts = await renders.during(canvasElement, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Add row' }));
      await expect(await canvas.findByText('Row d')).toBeVisible();
      await nextFrames();
    });

    await expect(counts.ShortcutRow).toHaveProperty('mounts', 1);
    // The new row's own ContextActions is counted, so the bound below counts the component it names.
    await expect(counts.ContextActions).toHaveProperty('mounts', 1);
    // Only the new row's own declaration may draw again once its keys are handed out; rows a, b and c do not.
    await expect(
      updatedRows(counts, 'ContextActions').filter((row) => row !== 'd'),
    ).toEqual([]);
    await expect(updatedRows(counts, 'ShortcutRow')).toEqual([]);
  },
};

const hintOf = async (
  row: string,
  {
    canvas,
    canvasElement,
    userEvent,
  }: Parameters<NonNullable<Story['play']>>[0],
): Promise<HTMLElement> => {
  await userEvent.pointer({
    keys: '[MouseRight]',
    target: canvas.getByRole('button', { name: `Row ${row}` }),
  });
  const page = within(canvasElement.ownerDocument.body);

  return page.findByRole('menuitem', { name: new RegExp(`Act ${row}`) });
};

// A new Plugin row that asks for a key a sibling holds does not take it: its hint is absent and the holder's stays.
export const NewRowTakingHeldKeyLosesIt: Story = {
  render: () => <GrowingRows added="dup" plugin />,
  play: async (context) => {
    await settleLayout('wide');
    await nextFrames();
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: 'Add row' }),
    );
    await context.canvas.findByRole('button', { name: 'Row dup' });
    await nextFrames();

    const winner = await hintOf('a', context);
    await waitFor(() => expect(within(winner).getByText('A')).toBeVisible());
    await context.userEvent.keyboard('{Escape}');

    const loser = await hintOf('dup', context);
    await expect(within(loser).queryByText('A')).toBeNull();
    await context.userEvent.keyboard('{Escape}');
  },
};

// Two Plugin rows ask for one key; the first holds it until it goes away.
function HolderLeaves(): React.JSX.Element {
  const [gone, setGone] = useState(false);

  return (
    <ActionShortcutScope>
      <Button label="Remove row a" onPress={() => setGone(true)} />
      <PluginTreeContext value>
        {(gone ? ['dup'] : ['a', 'dup']).map((name) => (
          <ShortcutRow key={name} name={name} />
        ))}
      </PluginTreeContext>
    </ActionShortcutScope>
  );
}

// The row that lost a key shows its hint once the row holding it is gone.
export const LoserShowsHintWhenHolderLeaves: Story = {
  render: () => <HolderLeaves />,
  play: async (context) => {
    await settleLayout('wide');
    await nextFrames();

    const before = await hintOf('dup', context);
    await expect(within(before).queryByText('A')).toBeNull();
    await context.userEvent.keyboard('{Escape}');

    await context.userEvent.click(
      context.canvas.getByRole('button', { name: 'Remove row a' }),
    );
    await waitFor(() =>
      expect(
        context.canvas.queryByRole('button', { name: 'Row a' }),
      ).toBeNull(),
    );

    const after = await hintOf('dup', context);
    await waitFor(() => expect(within(after).getByText('A')).toBeVisible());
    await context.userEvent.keyboard('{Escape}');
  },
};
