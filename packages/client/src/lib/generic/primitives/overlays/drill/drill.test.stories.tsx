import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { MenuTrigger } from '#primitives/overlays/menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Drill } from './drill';

const picked = fn<(value: string) => void>();

const meta = {
  title: 'Tests/Drill',
  beforeEach: async (): Promise<void> => {
    picked.mockClear();
    await settleViewport(layoutWidths.wide);
  },
  render: (): ReactElement => <Menu />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fruits = ['Apple', 'Banana', 'Cherry'];

const vegetables = ['Carrot', 'Leek'];

function Menu(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger>
        <MenuTrigger label="Configure" />
      </PopoverTrigger>
      <PopoverContent accessibilityLabel="Configure" className="p-0">
        <List appearance="grouped" fit>
          <List.Section>
            <Choice label="Fruit" choices={fruits} keepOpen />
            <Choice label="Vegetable" choices={vegetables} />
          </List.Section>
        </List>
      </PopoverContent>
    </Popover>
  );
}

type ChoiceProps = { label: string; choices: string[]; keepOpen?: boolean };

function Choice(props: ChoiceProps): ReactElement {
  const [value, setValue] = useState(props.choices[0] ?? '');

  return (
    <Drill
      label={props.label}
      value={value}
      title={`Select ${props.label}`}
      keepOpen={props.keepOpen}
    >
      {(close) => (
        <List appearance="grouped" fit>
          <List.Section
            selectionMode="single"
            selection={[value]}
            onSelectionChange={([next = value]) => {
              setValue(next);
              picked(next);
              close();
            }}
          >
            {props.choices.map((choice) => (
              <ListItem key={choice} id={choice} title={choice} />
            ))}
          </List.Section>
        </List>
      )}
    </Drill>
  );
}

const page = within(document.body);

// Radix marks a closing popover at once, before its exit transition ends.
const openState = 'data-state';

async function openChoices(
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
  label: string,
): Promise<{ menu: HTMLElement; choices: HTMLElement }> {
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

// Several picks in a row: each applies, and the choices and their menu stay open until a click outside.
export const KeepOpenKeepsBothOpenAfterAPick: Story = {
  play: async ({ userEvent }) => {
    const { menu, choices } = await openChoices(userEvent, 'Fruit');

    await userEvent.click(
      within(choices).getByRole('button', { name: 'Banana' }),
    );
    await userEvent.click(
      within(choices).getByRole('button', { name: 'Cherry' }),
    );

    await expect(picked.mock.calls).toEqual([['Banana'], ['Cherry']]);
    await expect(
      within(menu).getByRole('button', { name: 'Fruit, Cherry' }),
    ).toBeVisible();
    await expect(choices).toHaveAttribute(openState, 'open');
    await expect(menu).toHaveAttribute(openState, 'open');

    await userEvent.click(document.body);
    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await waitFor(() => expect(menu).not.toBeInTheDocument());
  },
};

// After a kept-open pick, Escape closes the choices and their menu together.
export const KeepOpenEscapeClosesBoth: Story = {
  play: async ({ userEvent }) => {
    const { menu, choices } = await openChoices(userEvent, 'Fruit');

    await userEvent.click(
      within(choices).getByRole('button', { name: 'Banana' }),
    );
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await waitFor(() => expect(menu).not.toBeInTheDocument());
  },
};

// Paper's drilled row: the choices open beside the menu with no title of their own.
export const RowChoicesHaveNoTitle: Story = {
  play: async ({ userEvent }) => {
    const { choices } = await openChoices(userEvent, 'Fruit');

    await expect(
      within(choices).getByRole('button', { name: 'Apple' }),
    ).toBeVisible();
    await expect(
      within(choices).queryByRole('heading'),
    ).not.toBeInTheDocument();
  },
};

// Without keepOpen, a pick closes the choices.
export const PickClosesChoicesByDefault: Story = {
  play: async ({ userEvent }) => {
    const { choices } = await openChoices(userEvent, 'Vegetable');

    await userEvent.click(
      within(choices).getByRole('button', { name: 'Leek' }),
    );

    await expect(picked.mock.calls).toEqual([['Leek']]);
    await expect(choices).toHaveAttribute(openState, 'closed');
    await waitFor(() => expect(choices).not.toBeInTheDocument());
  },
};
