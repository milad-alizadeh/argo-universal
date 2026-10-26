import { findToast } from '@repo/kit/mocks/find-toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { ListItem } from '../list-item';
import { List } from './list';
import { logList, pagedList, searchedList } from './list-behaviours-fixtures';
import {
  LogExample,
  PagedExample,
  SectionLogExample,
} from './list-behaviours.mocks';

const loadingLabel = 'Loading more';

const selectedAttribute = 'aria-pressed';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Behaviours',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const items = ['One', 'Two', 'Three'];

function Selectable(): React.JSX.Element {
  const [selected, onChange] = useState<readonly string[]>([]);

  return (
    <List
      items={items}
      keyExtractor={(item) => item}
      selection={{ mode: 'multiple', selected, onChange }}
      renderItem={(item) => (
        <ListItem
          id={item}
          title={item}
          href="/selection-test"
          onPress={() => {}}
        />
      )}
    />
  );
}

export const ModifierSelection: Story = {
  render: () => <Selectable />,
  play: async ({ canvas, userEvent }) => {
    const one = await canvas.findByRole('button', { name: 'One' });
    await userEvent.keyboard('{Meta>}');
    await userEvent.click(one);
    await userEvent.keyboard('{/Meta}');
    await expect(one).toHaveAttribute(selectedAttribute, 'true');
    await userEvent.keyboard('{Shift>}');
    await userEvent.click(canvas.getByRole('button', { name: 'Three' }));
    await userEvent.keyboard('{/Shift}');
    await expect(canvas.getByRole('button', { name: 'Two' })).toHaveAttribute(
      selectedAttribute,
      'true',
    );
  },
};

export const LoadsAnotherPageAutomatically: Story = {
  render: () => <PagedExample {...pagedList} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText('Paged items');
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      scroll.dispatchEvent(new Event('scroll'));
      await expect(canvas.getByLabelText(loadingLabel)).toBeVisible();
    });
    await waitFor(() =>
      expect(canvas.queryByLabelText(loadingLabel)).toBeNull(),
    );
    scroll.scrollTop = scroll.scrollHeight;
    scroll.dispatchEvent(new Event('scroll'));
    await expect(await canvas.findByText('Item 60')).toBeVisible();
  },
};

export const FiltersLoadedRowsInTheApp: Story = {
  render: () => <List {...searchedList} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('searchbox', { name: 'Search' }),
      'Item 39',
    );
    await expect(await canvas.findByText('Item 39')).toBeVisible();
    await expect(canvas.queryByText('Item 1')).toBeNull();
  },
};

export const SelectAllSkipsDisabledRows: Story = {
  render: () => <FixedSelection />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'One' }));
    await userEvent.keyboard('{Meta>}a{/Meta}');
    await expect(canvas.getByRole('button', { name: 'Two' })).toHaveAttribute(
      selectedAttribute,
      'true',
    );
    await expect(
      canvas.getByRole('button', { name: 'Locked' }),
    ).toHaveAttribute(selectedAttribute, 'false');
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByRole('button', { name: 'One' })).toHaveAttribute(
      selectedAttribute,
      'false',
    );
  },
};

function FixedSelection(): React.JSX.Element {
  const [selected, onChange] = useState<readonly string[]>([]);

  return (
    <List selection={{ mode: 'multiple', selected, onChange }}>
      <ListItem id="one" title="One" />
      <ListItem id="two" title="Two" />
      <ListItem id="locked" title="Locked" disabled />
    </List>
  );
}

export const JumpToLatestAfterScrollingAway: Story = {
  render: () => <LogExample {...logList} />,
  play: async ({ canvas, userEvent }) => {
    const scroll = await canvas.findByLabelText('Log lines');
    await waitFor(() => expect(canvas.getByText('Item 120')).toBeVisible());
    await waitFor(async () => {
      scroll.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -scroll.clientHeight }),
      );
      scroll.scrollTop = 0;
      scroll.dispatchEvent(new Event('scroll'));
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Append' }));
    await expect(
      await canvas.findByRole('button', { name: 'Jump to latest, new rows' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Jump to latest, new rows' }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
    await expect(await canvas.findByText('Item 121')).toBeVisible();
  },
};

export const FailedPageShowsOneToast: Story = {
  render: () => <PagedExample {...pagedList} fail />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText('Paged items');
    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      scroll.dispatchEvent(new Event('scroll'));
      await expect(canvas.getByLabelText(loadingLabel)).toBeVisible();
    });
    await expect(await findToast("Couldn't load more")).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Retry' })).toBeNull();
    await expect(canvas.queryByLabelText(loadingLabel)).toBeNull();
  },
};

export const DataSelectionSkipsDisabledRows: Story = {
  ...SelectAllSkipsDisabledRows,
  render: () => <FixedDataSelection />,
};

function FixedDataSelection(): React.JSX.Element {
  const [selected, onChange] = useState<readonly string[]>([]);

  return (
    <List
      items={['One', 'Two', 'Locked']}
      keyExtractor={(item) => item}
      selection={{ mode: 'multiple', selected, onChange }}
      renderItem={(item) => (
        <ListItem id={item} title={item} disabled={item === 'Locked'} />
      )}
    />
  );
}

export const JumpAfterAppendingWithinSection: Story = {
  ...JumpToLatestAfterScrollingAway,
  render: () => <SectionLogExample />,
};

// A caller's own scroll props win over the anchor's: with the end not followed, the list stays on its first rows.
export const CallerScrollPropsWinOverTheAnchor: Story = {
  render: () => (
    <LogExample
      {...logList}
      initialScrollAtEnd={false}
      maintainScrollAtEnd={false}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Item 1')).toBeVisible();
    await expect(canvas.queryByText('Item 120')).toBeNull();
  },
};
