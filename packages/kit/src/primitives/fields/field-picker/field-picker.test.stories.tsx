import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import { ControlledScreen, ControlledPicker } from './field-picker-controlled';
import { inStackedSection } from './field-picker-decorators';
import {
  emptyOption,
  inline,
  inlineMultiple,
  menu,
  menuMultiple,
  screenMultiple,
  screenWithButton,
  screenWithLogo,
  screenWithSearch,
} from './field-picker-fixtures';

const changed = fn<(value: string | readonly string[]) => void>();

const pressed = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldPicker',
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
    beforeEach: (): Promise<void> => settleLayout(width),
    render: () => (
      <ControlledPicker {...screenWithSearch} onValueChange={changed} />
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

// A click on the row's title, away from its value, opens the choices, and the row stays one button.
export const RowOpensFromTitleMenu: Story = {
  render: () => <ControlledPicker {...menu} onValueChange={changed} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByText('Label'));
    await expect(
      await within(document.body).findByRole('option', { name: 'One' }),
    ).toBeInTheDocument();
  },
};

// A page's row leads with the chosen option's logo.
export const RowLeadsWithChosenLogo: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <ControlledPicker {...screenWithLogo} onValueChange={changed} />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Label icon')).toBeVisible();
  },
};

export const RowOpensFromTitleScreen: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <ControlledPicker {...screenWithSearch} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByText('Label'));
    await expect(
      await within(document.body).findByRole('radio', { name: 'Elm' }),
    ).toBeInTheDocument();
  },
};

export const ChoosesInPopover = choosing(layoutWidths.wide);

export const ChoosesOnPushedScreen = choosing(layoutWidths.phone);

export const SearchFiltersAndShowsEmptyState: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <ControlledPicker {...screenWithSearch} onValueChange={changed} />
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

// A page with no options at all is not a search with no matches, so it does not say so.
function noOptions(emptyText?: string): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout('wide'),
    render: () => (
      <ControlledPicker
        {...screenWithSearch}
        options={[]}
        emptyText={emptyText}
        onValueChange={changed}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      const page = within(document.body);
      await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
      const status = await page.findByRole('status');

      // With nothing to search, it must not blame a search that never happened.
      await (emptyText
        ? expect(status).toHaveTextContent(emptyText)
        : expect(status).not.toHaveTextContent(/matching/iu));
    },
  };
}

export const NoOptionsSaysSo = noOptions();

export const NoOptionsNamesWhatIsMissing = noOptions('Nothing installed yet');

export const ArrowKeysAndEnterChoose: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <ControlledPicker {...screenWithSearch} onValueChange={changed} />
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
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <ControlledPicker {...screenMultiple} onValueChange={changed} />
  ),
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

// A choice the search hides stays chosen while the reader ticks another.
export const MultipleKeepsHiddenChoices: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => (
    <ControlledPicker {...screenMultiple} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
    await userEvent.type(
      await page.findByRole('searchbox', { name: searchLabel }),
      'elm',
    );
    await waitFor(() =>
      expect(page.queryByRole('button', { name: /^Alder/ })).toBeNull(),
    );
    await userEvent.click(page.getByRole('button', { name: /^Elm/ }));
    await expect(changed).toHaveBeenLastCalledWith(['alder', 'elm', 'oak']);
  },
};

// The page's action closes the page and runs: below the choices in a popover, in the header of a pushed page.
export const ActionRunsAndCloses = actionRunning(layoutWidths.wide);

export const HeaderActionRunsAndCloses = actionRunning(layoutWidths.phone);

function actionRunning(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(width),
    render: () => (
      <ControlledPicker
        {...screenWithButton}
        footerAction={{ label: 'Add options', icon: 'add', onPress: pressed }}
        onValueChange={changed}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      const page = within(document.body);
      await userEvent.click(canvas.getByRole('button', { name: /^Label/ }));
      await page.findByRole('radio', { name: /Three/ });
      await userEvent.click(page.getByRole('button', { name: 'Add options' }));
      await expect(pressed).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(page.queryByRole('radio', { name: /Three/ })).toBeNull(),
      );
    },
  };
}

// A short several-of choice opens in place on the web as the page does, and also reports the list.
export const MultipleMenuReportsList: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
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

// An inline single choice is a radio per option; choosing one reports it and checks it.
export const InlineChoosesOneRadio: Story = {
  render: () => <ControlledPicker {...inline} onValueChange={changed} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('radio', { name: /^Two/ })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: /^Three/ }));
    await expect(changed).toHaveBeenCalledWith('three');
    await expect(canvas.getByRole('radio', { name: /^Three/ })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: /^Two/ })).not.toBeChecked();
  },
};

// An inline multiple choice is a checkbox per option; each toggles and reports the whole list.
export const InlineTogglesCheckboxes: Story = {
  render: () => (
    <ControlledPicker {...inlineMultiple} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: /^Two/ }));
    await expect(changed).toHaveBeenCalledWith(['one', 'two', 'three']);
    await userEvent.click(canvas.getByRole('checkbox', { name: /^One/ }));
    await expect(changed).toHaveBeenLastCalledWith(['two', 'three']);
    await expect(
      canvas.getByRole('checkbox', { name: /^One/ }),
    ).not.toBeChecked();
  },
};

// The page's rows report a choice: the web's rows are radios, and a phone's native rows are the same options.
export const ScreenRowsChoose: Story = {
  render: () => (
    <ControlledScreen {...screenWithSearch} onValueChange={changed} />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole('radio', { name: /^Cedar/ })).toBeVisible();
    await userEvent.click(canvas.getByRole('radio', { name: /^Elm/ }));
    await expect(changed).toHaveBeenCalledWith('elm');
  },
};

export const InlineArrowKeysMoveAndChoose: Story = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  render: () => <ControlledPicker {...inline} onValueChange={changed} />,
  play: async ({ canvas, userEvent }) => {
    const radios = await canvas.findAllByRole('radio');
    radios[0]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(radios[1]).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(radios.at(-1)).toHaveFocus();
    await expect(changed).toHaveBeenCalled();
  },
};

export const PendingOptionShowsApplying: Story = {
  render: () => (
    <ControlledPicker
      {...inline}
      options={inline.options.map((option, index) => ({
        ...option,
        pending: index === 0,
      }))}
      onValueChange={changed}
    />
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Applying')).toBeVisible();
  },
};
