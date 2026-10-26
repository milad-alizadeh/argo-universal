import { allToasts, findToast } from '@repo/kit/mocks/find-toast';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { primaryModifier } from '#primitives/content/kbd';
import { Text } from '#primitives/content/text';
import { dismissToasts } from '#primitives/overlays/toast';
import { ListItem } from '../list-item';
import { List } from './list';
import {
  completeList,
  logList,
  pagedList,
  refreshableList,
  searchedList,
} from './list-behaviours-fixtures';
import {
  LogExample,
  PagedExample,
  SectionLogExample,
} from './list-behaviours.mocks';

const loadingLabel = 'Loading more';

const pagedLabel = 'Paged items';

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
    const scroll = await canvas.findByLabelText(pagedLabel);
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
    const scroll = await canvas.findByLabelText(pagedLabel);
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

// A row's ListItem sits inside a component, so the element `renderItem` returns carries neither its `id` nor its `disabled`.
function WrappedRow({ item }: { item: string }): React.JSX.Element {
  return <ListItem id={item} title={item} disabled={item === 'Locked'} />;
}

export const WrappedRowsSkipDisabledRows: Story = {
  ...SelectAllSkipsDisabledRows,
  render: () => <WrappedSelection />,
};

function WrappedSelection(): React.JSX.Element {
  const [selected, onChange] = useState<readonly string[]>([]);

  return (
    <List
      items={['One', 'Two', 'Locked']}
      keyExtractor={(item) => item}
      selection={{ mode: 'multiple', selected, onChange }}
      renderItem={(item) => <WrappedRow item={item} />}
    />
  );
}

// The Action only reports what it was given; ending the selection is the List's.
function ArchivingList(): React.JSX.Element {
  const [selected, onChange] = useState<readonly string[]>([]);
  const [archived, setArchived] = useState<readonly string[]>([]);

  return (
    <>
      <Text>{`Archived ${archived.join(' ') || 'nothing'}`}</Text>
      <List
        items={items}
        keyExtractor={(item) => item}
        selection={{ mode: 'multiple', selected, onChange }}
        actions={
          <Action
            key="archive"
            label="Archive"
            icon="archive"
            onPress={() => setArchived(selected)}
          />
        }
        renderItem={(item) => <ListItem id={item} title={item} />}
      />
    </>
  );
}

export const SelectionActionEndsSelection: Story = {
  render: () => <ArchivingList />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'One' }));
    await userEvent.keyboard('{Meta>}');
    await userEvent.click(canvas.getByRole('button', { name: 'Two' }));
    await userEvent.keyboard('{/Meta}');
    await userEvent.click(
      await canvas.findByRole('button', { name: /^Archive/ }),
    );
    await expect(await canvas.findByText('Archived One Two')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'One' })).toHaveAttribute(
      selectedAttribute,
      'false',
    );
    await expect(canvas.getByRole('button', { name: 'Two' })).toHaveAttribute(
      selectedAttribute,
      'false',
    );
    await expect(canvas.queryByRole('button', { name: /^Archive/ })).toBeNull();
  },
};

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

const loadFailed = "Couldn't load more";

type Scroller = HTMLElement;

const scrollToEnd = (scroll: Scroller): void => {
  scroll.scrollTop = scroll.scrollHeight;
  scroll.dispatchEvent(new Event('scroll'));
};

const scrollToStart = (scroll: Scroller): void => {
  scroll.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -scroll.clientHeight }),
  );
  scroll.scrollTop = 0;
  scroll.dispatchEvent(new Event('scroll'));
};

const precedes = (first: Node, second: Node): boolean =>
  Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

export const SpinnerSitsAtTheEnd: Story = {
  render: () => <PagedExample {...pagedList} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText(pagedLabel);

    const spinner = await waitFor(async () => {
      scrollToEnd(scroll);

      return canvas.getByLabelText(loadingLabel);
    });

    const rows = canvas.getAllByText(/^Item \d+$/);
    const last = rows.at(-1);

    if (!last) throw new Error('Expected rows');
    await expect(precedes(last, spinner)).toBe(true);
  },
};

export const SpinnerSitsAtTheTopWhenAnchoredToTheEnd: Story = {
  render: () => <PagedExample {...pagedList} anchor="end" />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText(pagedLabel);
    // An anchored List first settles on its newest row; only then can it reach the top.
    await waitFor(() => expect(canvas.getByText('Item 40')).toBeVisible());

    const spinner = await waitFor(async () => {
      scrollToStart(scroll);

      return canvas.getByLabelText(loadingLabel);
    });

    const first = canvas.getAllByText(/^Item \d+$/)[0];

    if (!first) throw new Error('Expected rows');
    await expect(precedes(spinner, first)).toBe(true);
  },
};

export const FailedPageRetriesAtTheEnd: Story = {
  render: () => <RetryingList />,
  play: async ({ canvas }) => {
    dismissToasts();
    const scroll = await canvas.findByLabelText(pagedLabel);
    await waitFor(async () => {
      scrollToEnd(scroll);
      await expect(await allToasts(loadFailed)).toHaveLength(1);
    });
    await waitFor(() =>
      expect(canvas.queryByLabelText(loadingLabel)).toBeNull(),
    );
    await expect(retried).toHaveBeenCalledTimes(1);
    scrollToStart(scroll);
    await expect(await canvas.findByText('Item 1')).toBeVisible();
    await waitFor(async () => {
      scrollToEnd(scroll);
      await expect(retried).toHaveBeenCalledTimes(2);
    });
    await waitFor(() =>
      expect(canvas.queryByLabelText(loadingLabel)).toBeNull(),
    );
    scrollToEnd(scroll);
    await expect(await canvas.findByText('Item 60')).toBeVisible();
    await expect(await allToasts(loadFailed)).toHaveLength(1);
  },
};

const retried = fn();

function RetryingList(): React.JSX.Element {
  retried.mockClear();

  return <PagedExample {...pagedList} failOnce onLoad={retried} />;
}

export const NothingLoadsAfterTheLastPage: Story = {
  render: () => <CompleteList />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByLabelText(pagedLabel);
    await waitFor(async () => {
      scrollToEnd(scroll);
      await expect(await canvas.findByText('Item 60')).toBeVisible();
    });
    scrollToEnd(scroll);
    await expect(ended).not.toHaveBeenCalled();
    await expect(canvas.queryByLabelText(loadingLabel)).toBeNull();
  },
};

const ended = fn();

function CompleteList(): React.JSX.Element {
  ended.mockClear();

  return <PagedExample {...completeList} onLoad={ended} />;
}

export const WebDrawsNothingForRefresh: Story = {
  render: () => <List {...refreshableList} />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Item 1')).toBeVisible();
    await expect(canvas.queryByRole('progressbar')).toBeNull();
    await expect(canvas.queryByRole('button', { name: /refresh/i })).toBeNull();
  },
};

const pressableRow = (title: string): React.JSX.Element => (
  <ListItem id={title} title={title} onPress={() => {}} />
);

// The primary key is ⌘ on Apple keyboards and Ctrl elsewhere.
const pressRefresh = (): string => {
  const key = primaryModifier() === 'meta' ? 'Meta' : 'Control';

  return `{${key}>}r{/${key}}`;
};

const refreshed = fn();

export const PrimaryRRefreshesOnWeb: Story = {
  render: () => (
    <List
      {...refreshableList}
      renderItem={pressableRow}
      onRefresh={refreshed}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    refreshed.mockClear();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Item 1' }),
    );
    await userEvent.keyboard(pressRefresh());
    await expect(refreshed).toHaveBeenCalledOnce();
  },
};

const refreshFailed = "Couldn't refresh";

export const FailedRefreshShowsOneToast: Story = {
  render: () => (
    <List
      {...refreshableList}
      renderItem={pressableRow}
      onRefresh={() => Promise.reject(new Error('Refused'))}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    dismissToasts();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Item 1' }),
    );
    await userEvent.keyboard(pressRefresh());
    await expect(await findToast(refreshFailed)).toBeVisible();
    await expect(await allToasts(refreshFailed)).toHaveLength(1);
  },
};
