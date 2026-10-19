import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { List } from '#primitives/lists/list';
import { MenuTrigger } from '#primitives/overlays/menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Combobox } from './combobox';

const changed = fn<(value: string) => void>();

const options = [
  { value: 'argo', label: 'Argo' },
  { value: 'paper', label: 'Paper' },
];

const meta = {
  title: 'Tests/ComboboxRow',
  beforeEach: (): void => {
    changed.mockClear();
  },
  render: (): ReactElement => <Menu />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

function Menu(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger>
        <MenuTrigger label="Configure" />
      </PopoverTrigger>
      <PopoverContent accessibilityLabel="Configure" className="p-0">
        <Rows />
      </PopoverContent>
    </Popover>
  );
}

function Rows(): ReactElement {
  return (
    <List appearance="grouped" fit>
      <List.Section>
        <Row label="Project" keepOpen searchable={false} />
        <Row label="Branch" />
      </List.Section>
    </List>
  );
}

type RowProps = { label: string; keepOpen?: boolean; searchable?: boolean };

function Row(props: RowProps): ReactElement {
  const [value, setValue] = useState('argo');

  return (
    <Combobox
      {...props}
      variant="row"
      title={`Select ${props.label}`}
      value={value}
      options={options}
      onValueChange={(next) => {
        setValue(next);
        changed(next);
      }}
    />
  );
}

const page = within(document.body);

// Radix marks a closing popover at once, before its exit transition ends.
const openState = 'data-state';

async function openRow(
  { userEvent }: PlayContext,
  label: string,
): Promise<{ menu: HTMLElement; choices: HTMLElement }> {
  await settleViewport(layoutWidths.wide);
  await userEvent.click(page.getByRole('button', { name: 'Configure' }));
  const menu = await page.findByRole('dialog', { name: 'Configure' });
  await userEvent.click(
    within(menu).getByRole('button', { name: new RegExp(`^${label},`) }),
  );

  return {
    menu,
    choices: await page.findByRole('dialog', { name: `Select ${label}` }),
  };
}

// A desktop row with keepOpen and no search: picks apply while the choices and the menu stay open.
export const RowKeepsOpenWithoutSearchWide: Story = {
  play: async (context) => {
    const { menu, choices } = await openRow(context, 'Project');

    await expect(within(choices).queryByRole('searchbox')).toBeNull();
    await context.userEvent.click(
      within(choices).getByRole('radio', { name: 'Paper' }),
    );

    await expect(changed).toHaveBeenCalledWith('paper');
    await expect(
      within(menu).getByRole('button', { name: 'Project, Paper' }),
    ).toBeVisible();
    await expect(choices).toHaveAttribute(openState, 'open');
    await expect(menu).toHaveAttribute(openState, 'open');

    await context.userEvent.click(document.body);
    await waitFor(() => expect(menu).not.toBeInTheDocument());
  },
};

// By default a row keeps its search, and a pick closes its choices.
export const RowSearchesAndClosesByDefaultWide: Story = {
  play: async (context) => {
    const { choices } = await openRow(context, 'Branch');

    const search = within(choices).getByRole('searchbox', {
      name: 'Search Branch',
    });

    // The choices fade in from transparent, so the search shows once their entrance starts.
    await waitFor(() => expect(search).toBeVisible());
    await context.userEvent.click(
      within(choices).getByRole('radio', { name: 'Paper' }),
    );

    await expect(changed).toHaveBeenCalledWith('paper');
    await waitFor(() => expect(choices).not.toBeInTheDocument());
  },
};

// A phone's page keeps the search, as long lists still need it there.
export const RowSearchesOnPhone: Story = {
  render: (): ReactElement => <Rows />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      canvas.getByRole('button', { name: /^Project, Argo/ }),
    );

    await expect(
      await page.findByRole('searchbox', { name: 'Search Project' }),
    ).toBeVisible();
  },
};
