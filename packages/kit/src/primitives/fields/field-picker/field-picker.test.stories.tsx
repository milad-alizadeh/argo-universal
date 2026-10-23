import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { ControlledPicker } from './field-picker-controlled';
import { inStackedSection } from './field-picker-decorators';
import {
  emptyOption,
  menu,
  menuMultiple,
  pageMultiple,
  pageWithButton,
  pageWithSearch,
} from './field-picker-fixtures';

const changed = fn<(value: string | readonly string[]) => void>();

const pressed = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Fields/FieldPicker',
  beforeEach: (): void => {
    changed.mockClear();
    pressed.mockClear();
  },
  decorators: inStackedSection,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const searchLabel = 'Search Label';

export const ShowsTitle: Story = {
  render: () => <ControlledPicker {...menu} onValueChange={changed} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Label')).toBeVisible();
  },
};

// A page shows the chosen label on its row; choosing another reports it, closes the page (a popover on a desktop window, Back on a phone) and shows on the row.
function choosing(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(width),
    render: () => (
      <ControlledPicker {...pageWithSearch} onValueChange={changed} />
    ),
    play: async ({ canvas, userEvent }) => {
      const page = within(document.body);
      await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
      await userEvent.click(await page.findByRole('radio', { name: 'Elm' }));
      await expect(changed).toHaveBeenCalledWith('elm');
      await waitFor(() =>
        expect(
          canvas.getByRole('button', { name: /^Label/ }),
        ).toHaveTextContent('Elm'),
      );
    },
  };
}

export const ChoosesInPopover = choosing(layoutWidths.wide);

export const ChoosesOnPushedPage = choosing(layoutWidths.phone);

export const SearchFiltersAndShowsEmptyState: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: () => (
    <ControlledPicker {...pageWithSearch} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));

    const search = await page.findByRole('searchbox', { name: searchLabel });

    await expect(search).toHaveFocus();
    await userEvent.type(search, 'oa');
    await expect(page.getByRole('radio', { name: /Oak/ })).toBeVisible();
    await expect(page.queryByRole('radio', { name: /^Elm/ })).toBeNull();
    await userEvent.clear(search);
    await userEvent.type(search, 'missing');
    await expect(page.getByRole('status')).toHaveTextContent(
      'No matching options',
    );
    await expect(changed).not.toHaveBeenCalled();
  },
};

export const ArrowKeysAndEnterChoose: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: () => (
    <ControlledPicker {...pageWithSearch} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
    await userEvent.type(
      await page.findByRole('searchbox', { name: searchLabel }),
      'asp',
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(changed).toHaveBeenCalledWith('aspen');
  },
};

// A multiple page stays open, and every toggle reports the whole list in the options' order.
export const MultipleReportsEachToggle: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: () => <ControlledPicker {...pageMultiple} onValueChange={changed} />,
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
    await userEvent.click(await page.findByRole('button', { name: /^Elm/ }));
    await expect(changed).toHaveBeenLastCalledWith(['alder', 'elm', 'oak']);
    await userEvent.click(page.getByRole('button', { name: /^Alder/ }));
    await expect(changed).toHaveBeenLastCalledWith(['elm', 'oak']);
    await expect(
      page.getByRole('searchbox', { name: searchLabel }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: /^Label/ }),
    ).toHaveTextContent('Elm, Oak');
  },
};

// The page's action closes the page and runs.
export const ActionRunsAndCloses: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: () => (
    <ControlledPicker
      {...pageWithButton}
      footerAction={{ label: 'Add options', onPress: pressed }}
      onValueChange={changed}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
    await userEvent.click(
      await page.findByRole('button', { name: 'Add options' }),
    );
    await expect(pressed).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(page.queryByRole('searchbox', { name: searchLabel })).toBeNull(),
    );
  },
};

// A short several-of choice opens in place on the web as the page does, and also reports the list.
export const MultipleMenuReportsList: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  render: () => <ControlledPicker {...menuMultiple} onValueChange={changed} />,
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
    await userEvent.click(await page.findByRole('button', { name: /Two/ }));
    await expect(changed).toHaveBeenLastCalledWith(['one', 'two', 'three']);
  },
};

// A menu option whose value is the empty string chooses and reports like any other.
export const EmptyValueOptionChooses: Story = {
  render: () => <ControlledPicker {...emptyOption} onValueChange={changed} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
    await userEvent.click(
      await within(document.body).findByRole('option', { name: 'None' }),
    );
    await expect(changed).toHaveBeenCalledWith('');
  },
};
