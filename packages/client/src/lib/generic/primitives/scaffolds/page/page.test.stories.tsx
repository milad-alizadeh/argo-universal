import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { Page } from './index';

const meta = {
  title: 'Tests/Page',
  component: Page,
  args: { title: 'Projects' },
} satisfies Meta<typeof Page>;

export default meta;

type Story = StoryObj<typeof meta>;

// Page draws its own heading at both widths in a story, which has no navigator; each claim runs at both.
const widths = { Phone: layoutWidths.phone, Wide: layoutWidths.wide } as const;

function atWidth(width: number, story: Story): Story {
  return { ...story, beforeEach: () => settleViewport(width) };
}

const titleAndContent: Story = {
  args: { title: 'Projects', children: <Text>argo-universal</Text> },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible();
    await expect(canvas.getByText('argo-universal')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'More actions' }),
    ).not.toBeInTheDocument();
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
    primaryAction: {
      label: primaryLabel,
      icon: 'add',
      onPress: () => chosen('add'),
    },
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
    primaryAction: {
      label: primaryLabel,
      icon: 'add',
      disabled: true,
      onPress: chosen,
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: primaryLabel }),
    ).toBeDisabled();
  },
};
