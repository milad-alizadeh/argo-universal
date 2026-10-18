import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
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

export const TitleAndContent: Story = {
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
      search={{
        label: searchLabel,
        value,
        onChangeText: (text) => {
          onChangeText(text);
          changed(text);
        },
      }}
    >
      <Text>{value || 'All Projects'}</Text>
    </Page>
  );
}

export const SearchAndClear: Story = {
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
    await expect(
      canvas.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible();
    await expect(canvas.getByText('All Projects')).toBeVisible();
    await expect(changed).toHaveBeenLastCalledWith('');
  },
};

const chosen = fn();

export const HeaderActions: Story = {
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
        <Action
          label="Import"
          icon="repository"
          disabled
          onPress={() => chosen('import')}
        />
        <Action
          label="Archive"
          icon="archive"
          onPress={() => chosen('archive')}
        />
      </ActionList>
    ),
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    chosen.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: primaryLabel }));
    await expect(chosen).toHaveBeenLastCalledWith('add');
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
    await expect(chosen).toHaveBeenLastCalledWith('filters');
    await expect(canvas.getByRole('button', { name: 'Import' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Archive' }),
    );
    await expect(chosen).toHaveBeenLastCalledWith('archive');
  },
};

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
