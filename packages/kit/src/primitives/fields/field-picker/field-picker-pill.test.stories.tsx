import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { ControlledPicker } from './field-picker-controlled';
import { inStackedPage } from './field-picker-decorators';
import { pill, pillLoadError, pillLoading } from './field-picker-fixtures';

const changed = fn<(value: string | readonly string[]) => void>();

const meta = {
  title: 'Tests/Design System/Primitives/Fields/FieldPicker/Pill',
  beforeEach: (): void => {
    changed.mockClear();
  },
  decorators: inStackedPage,
  render: (): React.JSX.Element => (
    <ControlledPicker {...pill} onValueChange={changed} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const pillName = { name: /^Label/ };

const searchName = { name: 'Search Label' };

const page = (): ReturnType<typeof within> => within(document.body);

// Choosing a row reports it, closes the page and names it on the pill.
function choosing(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', pillName));
      await userEvent.click(await page().findByRole('radio', { name: 'Elm' }));
      await expect(changed).toHaveBeenCalledOnce();
      await expect(changed).toHaveBeenCalledWith('elm');
      await waitFor(() =>
        expect(canvas.getByRole('button', pillName)).toHaveTextContent('Elm'),
      );
      await waitFor(() =>
        expect(page().queryByRole('searchbox', searchName)).toBeNull(),
      );
    },
  };
}

export const ChoosesInPopover = choosing(layoutWidths.wide);

export const ChoosesOnPushedPage = choosing(layoutWidths.phone);

// The search field has focus as the popover opens; typing narrows the rows, and nothing is reported until a choice.
export const SearchFilters: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', pillName));

    const search = await page().findByRole('searchbox', searchName);

    await expect(search).toHaveFocus();
    await userEvent.type(search, 'oa');
    await expect(page().getByRole('radio', { name: /Oak/ })).toBeVisible();
    await expect(page().queryByRole('radio', { name: /^Elm/ })).toBeNull();
    await expect(changed).not.toHaveBeenCalled();
  },
};

export const EmptyState: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', pillName));
    await userEvent.type(
      await page().findByRole('searchbox', searchName),
      'missing',
    );
    await expect(page().getByRole('status')).toHaveTextContent(
      'No matching options',
    );
    await expect(page().queryByRole('radio')).toBeNull();
  },
};

export const ArrowKeysAndEnterChoose: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', pillName));
    await userEvent.type(
      await page().findByRole('searchbox', searchName),
      'asp',
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(changed).toHaveBeenCalledWith('aspen');
  },
};

// Loading and failed options say so below the rows.
export const LoadingSaysSo: Story = {
  render: (): React.JSX.Element => (
    <ControlledPicker {...pillLoading} onValueChange={changed} />
  ),
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', pillName));
    await expect(await page().findByRole('status')).toHaveTextContent(
      'Loading options…',
    );
  },
};

export const LoadErrorIsAnnounced: Story = {
  render: (): React.JSX.Element => (
    <ControlledPicker {...pillLoadError} onValueChange={changed} />
  ),
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', pillName));
    await expect(await page().findByRole('alert')).toHaveTextContent(
      'Could not load options.',
    );
  },
};
