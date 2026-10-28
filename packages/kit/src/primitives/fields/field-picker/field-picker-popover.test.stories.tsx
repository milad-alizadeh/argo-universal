import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { PopoverFieldGroup } from './field-picker-popover.mocks';

const changed = fn<(value: string | readonly string[]) => void>();

const meta = {
  title: 'Tests/Design System/Primitives/Forms/FieldPicker/Popover',
  beforeEach: async (): Promise<void> => {
    changed.mockClear();
    await settleLayout('wide');
  },
  render: (): ReactElement => <PopoverFieldGroup onValueChange={changed} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const page = within(document.body);

// Radix marks a closing popover at once, before its exit transition ends.
const openState = 'data-state';

type User = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

async function openConfigure(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
  userEvent: User,
): Promise<HTMLElement> {
  await userEvent.click(canvas.getByRole('button', { name: 'Configure' }));

  return page.findByRole('dialog', { name: 'Configure' });
}

async function openChoices(
  configure: HTMLElement,
  userEvent: User,
  row: RegExp,
): Promise<HTMLElement> {
  await userEvent.click(within(configure).getByRole('button', { name: row }));

  return page.findByRole('dialog', { name: /^(Model|Tags)$/ });
}

// A page picker in a popover opens its choices beside the popover, to its right, and the popover stays open under it.
export const PageOpensBesideThePopover: Story = {
  play: async ({ canvas, userEvent }) => {
    const configure = await openConfigure(canvas, userEvent);
    const choices = await openChoices(configure, userEvent, /^Model,/);
    const menuBox = configure.getBoundingClientRect();
    const choicesBox = choices.getBoundingClientRect();

    await expect(choicesBox.left).toBeGreaterThan(
      menuBox.left + menuBox.width / 2,
    );
    await expect(configure).toHaveAttribute(openState, 'open');
  },
};

// Its row ends in the right chevron of a row that opens a page, not the up-down of a value that changes in place.
export const RowEndsInRightChevron: Story = {
  play: async ({ canvas, userEvent }) => {
    const configure = await openConfigure(canvas, userEvent);
    const row = within(configure).getByRole('button', { name: /^Model,/ });

    await expect(
      within(row).getByTestId('icon-chevron-right'),
    ).toBeInTheDocument();
    await expect(
      within(row).queryByTestId('icon-chevron-up-down'),
    ).not.toBeInTheDocument();
  },
};

// A single choice closes the choices and leaves the popover open on the new value.
export const ChoiceClosesTheChoicesOnly: Story = {
  play: async ({ canvas, userEvent }) => {
    const configure = await openConfigure(canvas, userEvent);
    const choices = await openChoices(configure, userEvent, /^Model,/);

    await userEvent.click(
      within(choices).getByRole('radio', { name: 'Three' }),
    );

    await expect(changed).toHaveBeenCalledWith('three');
    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await expect(configure).toHaveAttribute(openState, 'open');
    await expect(
      within(configure).getByRole('button', { name: /^Model,/ }),
    ).toHaveTextContent('Three');
  },
};

// Escape closes the choices and returns to the popover, which a second Escape closes.
export const EscapeReturnsToThePopover: Story = {
  play: async ({ canvas, userEvent }) => {
    const configure = await openConfigure(canvas, userEvent);
    const choices = await openChoices(configure, userEvent, /^Model,/);

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await expect(configure).toHaveAttribute(openState, 'open');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(configure).not.toBeInTheDocument());
  },
};

// A multiple page keeps its choices open for the next pick.
export const MultipleKeepsChoicesOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    const configure = await openConfigure(canvas, userEvent);
    const choices = await openChoices(configure, userEvent, /^Tags,/);

    await userEvent.click(
      within(choices).getByRole('button', { name: /^Elm/ }),
    );
    await userEvent.click(
      within(choices).getByRole('button', { name: /^Fir/ }),
    );

    await expect(changed).toHaveBeenCalledTimes(2);
    await expect(choices).toHaveAttribute(openState, 'open');
    await expect(configure).toHaveAttribute(openState, 'open');
  },
};

// A FieldGroup in a popover draws its rows with no separator between them.
export const RowsHaveNoSeparators: Story = {
  play: async ({ canvas, userEvent }) => {
    const configure = await openConfigure(canvas, userEvent);

    await expect(within(configure).getByText('Agent')).toBeInTheDocument();
    await expect(within(configure).getByText('Mode')).toBeInTheDocument();
    await expect(within(configure).queryAllByRole('separator')).toHaveLength(0);
  },
};
