import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { withStack } from '#story-stack';
import { Screen, ScreenMenuContext } from './index';
import { atWidth, screenWidths as widths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen',
  component: Screen,
  args: { title: 'Title' },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

const project = 'Content';

const titleAndContent: Story = {
  args: { title: 'Title', children: <Text>{project}</Text> },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Title' }),
    ).toBeVisible();
    await expect(canvas.getByText(project)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
  },
};

const changed = fn();

const searchLabel = 'Search';

const primaryLabel = 'Add';

function SearchableScreen(): React.JSX.Element {
  const [value, onChangeText] = useState('');

  return (
    <Screen
      title="Title"
      search={{ label: searchLabel }}
      value={value}
      onChangeText={(text) => {
        onChangeText(text);
        changed(text);
      }}
    >
      <Text>{value || 'All'}</Text>
    </Screen>
  );
}

export const TitleAndContentPhone = atWidth(widths.Phone, titleAndContent);

export const TitleAndContentWide = atWidth(widths.Wide, titleAndContent);

const returned = fn();

const caption = 'Caption';

const drillIn = {
  title: project,
  caption,
  onBack: returned,
  children: <Text>Folder</Text>,
};

// A wide drill-in page draws its own Back and caption.
export const BackAndCaptionWide = atWidth(widths.Wide, {
  args: drillIn,
  play: async ({ canvas, userEvent }) => {
    returned.mockClear();
    await expect(canvas.getByText(caption)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(returned).toHaveBeenCalledOnce();
  },
});

// A phone's stack header has Back and no room for a caption, so the Screen draws neither.
export const BackAndCaptionPhone = atWidth(widths.Phone, {
  args: drillIn,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: project }),
    ).toBeVisible();
    await expect(canvas.queryByText(caption)).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
  },
});

const captionUrl = 'https://example.com/repo';

// A caption that goes somewhere carries the page's one link out, in place of its text.
export const LinkedCaptionWide = atWidth(widths.Wide, {
  args: { ...drillIn, captionHref: captionUrl },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: caption })).toHaveAttribute(
      'href',
      captionUrl,
    );
  },
});

const searchAndClear: Story = {
  render: () => <SearchableScreen />,
  play: async ({ canvas, userEvent }) => {
    changed.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: searchLabel }),
      'query',
    );
    await expect(canvas.getByText('query')).toBeVisible();
    await expect(changed).toHaveBeenLastCalledWith('query');
    await userEvent.click(canvas.getByRole('button', { name: 'Close search' }));
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Title' })).toBeVisible(),
    );
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.getByText('All')).toBeVisible();
    await expect(changed).toHaveBeenLastCalledWith('');
  },
};

export const SearchAndClearPhone = atWidth(widths.Phone, searchAndClear);

export const SearchAndClearWide = atWidth(widths.Wide, searchAndClear);

const chosen = fn();

// The Action suite covers disabled and overflow Actions; this checks the Screen draws and runs both kinds.
const headerActions: Story = {
  args: {
    title: 'Title',
    primaryAction: (
      <Action label={primaryLabel} icon="add" onPress={() => chosen('add')} />
    ),
    actions: (
      <Action
        label="Filters"
        icon="filters"
        onPress={() => chosen('filters')}
      />
    ),
  },
  play: async ({ canvas, userEvent }) => {
    chosen.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: primaryLabel }));
    await expect(chosen).toHaveBeenLastCalledWith('add');
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
    await expect(chosen).toHaveBeenLastCalledWith('filters');
  },
};

export const HeaderActionsPhone = atWidth(widths.Phone, headerActions);

export const HeaderActionsWide = atWidth(widths.Wide, headerActions);

export const DisabledPrimary: Story = {
  args: {
    title: 'Title',
    primaryAction: (
      <Action label={primaryLabel} icon="add" disabled onPress={chosen} />
    ),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: primaryLabel }),
    ).toBeDisabled();
  },
};

const opened = fn();

// A narrow root's ☰ is the App's provider; the Screen only draws it, in its stack's header.
const menuRoot: Story = {
  decorators: [withStack()],
  parameters: { screenPreview: true },
  render: () => (
    <ScreenMenuContext value={{ onOpen: opened, badge: false }}>
      <Screen title="Title">
        <Text>{project}</Text>
      </Screen>
    </ScreenMenuContext>
  ),
};

export const MenuPhone = atWidth(widths.Phone, {
  ...menuRoot,
  play: async ({ canvas, userEvent }) => {
    opened.mockClear();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open navigation' }),
    );
    await expect(opened).toHaveBeenCalledOnce();
  },
});

// A wide window draws the rail, so the Screen has no ☰.
export const MenuWide = atWidth(widths.Wide, {
  ...menuRoot,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { level: 1, name: 'Title' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Open navigation' }),
    ).toBeNull();
  },
});

function SelectableList(props: { items: string[] }): React.JSX.Element {
  const [selected, onChange] = useState<readonly string[]>([]);

  return (
    <List
      items={props.items}
      keyExtractor={(item) => item}
      selection={{ mode: 'multiple', selected, onChange }}
      renderItem={(item) => <ListItem id={item} title={item} />}
    />
  );
}

// The first List to select owns the Screen's header; a second selecting List draws its own toolbar in its column.
export const TwoSelectingListsShareOneHeader: Story = {
  render: () => (
    <Screen title="Title">
      <SelectableList items={['A1', 'A2']} />
      <SelectableList items={['B1', 'B2']} />
    </Screen>
  ),
  play: async ({ canvas, userEvent }) => {
    const selected = { level: 1, name: '1 selected' };

    await userEvent.keyboard('{Meta>}');
    await userEvent.click(await canvas.findByRole('button', { name: 'A1' }));
    await expect(await canvas.findByRole('heading', selected)).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: 'Title' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'B1' }));
    await userEvent.keyboard('{/Meta}');
    await expect(await canvas.findAllByRole('heading', selected)).toHaveLength(
      2,
    );
    await expect(canvas.queryByRole('heading', { name: 'Title' })).toBeNull();
  },
};
