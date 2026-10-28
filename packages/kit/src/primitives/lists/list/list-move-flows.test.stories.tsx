import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { ListItem } from '../list-item';
import { List, PluginList } from './list';
import { boardLanes, type BoardLane } from './list-moves-fixtures';
import type { ListProps } from './list-props';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/MoveFlows',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const open = (): void => {};

const section = (lane: BoardLane): ReactElement => (
  <List.Section key={lane.id} id={lane.id} title={lane.title}>
    {lane.rows.map((card) => (
      <ListItem key={card.id} id={card.id} title={card.title} onPress={open} />
    ))}
  </List.Section>
);

type Flow = Pick<ListProps<never>, 'layout' | 'direction'>;

// A Plugin's wire can still send `onMove` with a grid or a shelf; the kit's types keep it off both, and the List draws plain rows.
function flowStory(flow: Flow): Story {
  const onMove = fn();

  return {
    beforeEach: async () => {
      onMove.mockClear();
      await settleLayout('wide');
    },
    render: () => (
      <PluginList {...flow} onMove={onMove}>
        {boardLanes.map(section)}
      </PluginList>
    ),
    play: async ({ canvas, userEvent }) => {
      const row = (await canvas.findByText('Alpha')).closest<HTMLElement>(
        '[role="button"]',
      );

      row?.focus();
      await expect(row).toHaveFocus();
      await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

      await expect(onMove).not.toHaveBeenCalled();
    },
  };
}

export const ShelfRowsDoNotMove = flowStory({ direction: 'horizontal' });

export const GridRowsDoNotMove = flowStory({ layout: 'grid' });
