import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { PlatformsTable } from './table-platforms.mocks';
import {
  InPlaceRowDetail,
  RunsTable,
  SelectingRunsTable,
} from './table-runs.mocks';

const onSortChange = fn();

const onRowPress = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Table',
  parameters: { screenPreview: true },
  beforeEach: (): void => {
    onSortChange.mockClear();
    onRowPress.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

const rowNames = (rows: HTMLElement[]): string[] =>
  rows.map((row) => row.getAttribute('aria-label') ?? '');

export const SortsFromTheHeader: Story = {
  render: () => <RunsTable onSortChange={onSortChange} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);

    const table = await canvas.findByRole('table', { name: 'CI runs' });

    const started = within(table).getByRole('button', {
      name: 'Started, sorted ascending',
    });

    await expect(
      rowNames(within(table).getAllByRole('row', { name: /ago$/ }))[0],
    ).toMatch(/^Typecheck/);

    await userEvent.click(started);

    await expect(onSortChange).toHaveBeenCalledWith({
      column: 'started',
      direction: 'descending',
    });
    await expect(
      rowNames(within(table).getAllByRole('row', { name: /ago$/ }))[0],
    ).toMatch(/^Lint/);

    await userEvent.click(
      within(table).getByRole('button', { name: 'Duration' }),
    );

    await expect(onSortChange).toHaveBeenLastCalledWith({
      column: 'duration',
      direction: 'ascending',
    });
    // Columns without sortable are not buttons.
    await expect(
      within(table).queryByRole('button', { name: 'Branch' }),
    ).toBeNull();
  },
};

export const RowPressRunsItsAction: Story = {
  render: () => <RunsTable onRowPress={onRowPress} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);

    await userEvent.click(
      await canvas.findByRole('row', { name: /^Build iOS/ }),
    );

    await expect(onRowPress).toHaveBeenCalledWith('ios');
  },
};

export const RowPressTogglesSelection: Story = {
  render: () => <SelectingRunsTable onRowPress={onRowPress} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);

    const row = await canvas.findByRole('row', { name: /^Lint/ });

    await userEvent.click(row);
    await expect(row).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(row);
    await expect(row).toHaveAttribute('aria-selected', 'false');
    await expect(onRowPress).not.toHaveBeenCalled();
  },
};

export const CompactRowOpensRowDetail: Story = {
  render: () => (
    <InPlaceRowDetail>
      <RunsTable />
    </InPlaceRowDetail>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);

    await expect(canvas.queryByRole('table')).toBeNull();

    await userEvent.click(await canvas.findByText('Build iOS'));

    await expect(
      await canvas.findByRole('heading', { name: 'Build iOS' }),
    ).toBeVisible();

    for (const title of ['Branch', 'Status', 'Duration', 'Started']) {
      await expect(canvas.getByText(title)).toBeVisible();
    }

    await expect(canvas.getByText('8m 11s')).toBeVisible();
    await expect(canvas.queryByText('Typecheck')).toBeNull();
  },
};

export const CompactSortsFromTheMenu: Story = {
  render: () => <RunsTable onSortChange={onSortChange} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Sort by' }),
    );
    await userEvent.click(await within(document.body).findByText('Duration'));

    await expect(onSortChange).toHaveBeenCalledWith({
      column: 'duration',
      direction: 'ascending',
    });
  },
};

export const CompactSelectsRows: Story = {
  render: () => <SelectingRunsTable onRowPress={onRowPress} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);

    const lint = await canvas.findByRole('button', { name: /^Lint/ });

    await userEvent.click(lint);

    await waitFor(() => expect(lint).toHaveAttribute('aria-pressed', 'true'));
    await expect(onRowPress).not.toHaveBeenCalled();
  },
};

export const ScrollKeepsTheGridAtCompactWidths: Story = {
  render: () => <PlatformsTable />,
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.phone);

    await expect(
      await canvas.findByRole('table', { name: 'Platforms' }),
    ).toBeVisible();
    await expect(
      canvas.getByLabelText('Android, Planned, 1.5, Waits on Material 3'),
    ).toBeVisible();
  },
};
