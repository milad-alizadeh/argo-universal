import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Page } from './index';
import { atWidth, pageWidths as widths } from './page-widths.mocks';

const meta = {
  title: 'Tests/Page',
  component: Page,
  args: { title: 'Projects' },
} satisfies Meta<typeof Page>;

export default meta;

type Story = StoryObj<typeof meta>;

const project = 'argo-universal';

const titleAndContent: Story = {
  args: { title: 'Projects', children: <Text>{project}</Text> },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Projects' }),
    ).toBeVisible();
    await expect(canvas.getByText(project)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
  },
};

const changed = fn();

const searchLabel = 'Search Projects';

const primaryLabel = 'Add Project';

function SearchablePage(): React.JSX.Element {
  const [value, onChangeText] = useState('');

  return (
    <Page
      title="Projects"
      search={{ label: searchLabel }}
      value={value}
      onChangeText={(text) => {
        onChangeText(text);
        changed(text);
      }}
    >
      <Text>{value || 'All Projects'}</Text>
    </Page>
  );
}

export const TitleAndContentPhone = atWidth(widths.Phone, titleAndContent);

export const TitleAndContentWide = atWidth(widths.Wide, titleAndContent);

const returned = fn();

const caption = 'The Argo Server this App is talking to.';

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

// A phone's stack header has Back and no room for a caption, so the Page draws neither.
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

const searchAndClear: Story = {
  render: () => <SearchablePage />,
  play: async ({ canvas, userEvent }) => {
    changed.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: searchLabel }),
      'argo',
    );
    await expect(canvas.getByText('argo')).toBeVisible();
    await expect(changed).toHaveBeenLastCalledWith('argo');
    await userEvent.click(canvas.getByRole('button', { name: 'Close search' }));
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Projects' })).toBeVisible(),
    );
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.getByText('All Projects')).toBeVisible();
    await expect(changed).toHaveBeenLastCalledWith('');
  },
};

export const SearchAndClearPhone = atWidth(widths.Phone, searchAndClear);

export const SearchAndClearWide = atWidth(widths.Wide, searchAndClear);

const chosen = fn();

// ActionList's own suite covers disabled and overflow Actions; this checks the Page draws and runs both kinds.
const headerActions: Story = {
  args: {
    title: 'Projects',
    primaryAction: (
      <Action label={primaryLabel} icon="add" onPress={() => chosen('add')} />
    ),
    actions: (
      <ActionList>
        <Action
          label="Filters"
          icon="filters"
          onPress={() => chosen('filters')}
        />
      </ActionList>
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
    title: 'Projects',
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
