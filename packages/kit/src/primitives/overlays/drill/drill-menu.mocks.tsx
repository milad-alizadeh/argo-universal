import { useState, type ComponentProps, type ReactElement } from 'react';
import { fn } from 'storybook/test';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { MenuTrigger } from '#primitives/overlays/menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';
import { Drill } from './drill';

export const picked = fn<(value: string) => void>();

const fruits = ['Apple', 'Banana', 'Cherry'];

const vegetables = ['Carrot', 'Leek'];

// A Configure menu whose Fruit row keeps its choices open after a pick and whose Vegetable row does not.
export function Menu(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger>
        <MenuTrigger label="Configure" />
      </PopoverTrigger>
      <PopoverContent accessibilityLabel="Configure" className="p-0">
        <MenuRows />
      </PopoverContent>
    </Popover>
  );
}

function MenuRows(): ReactElement {
  return (
    <List appearance="plain" fit>
      <List.Section>
        <Choice label="Fruit" choices={fruits} keepOpen />
        <Choice label="Vegetable" choices={vegetables} />
      </List.Section>
    </List>
  );
}

type ChoiceProps = { label: string; choices: string[]; keepOpen?: boolean };

type ChoicesProps = ChoiceProps & {
  value: string;
  pick: (next: string) => void;
};

// The row's value, and a pick that records itself.
function usePicked(choices: string[]): [string, (next: string) => void] {
  const [value, setValue] = useState(choices[0] ?? '');

  return [
    value,
    (next) => {
      setValue(next);
      picked(next);
    },
  ];
}

function Choice(props: ChoiceProps): ReactElement {
  const [value, pick] = usePicked(props.choices);

  return (
    <Drill {...drillProps(props, value)}>
      {(close) => <Choices {...props} value={value} pick={both(pick, close)} />}
    </Drill>
  );
}

function both(pick: (next: string) => void, close: () => void) {
  return (next: string): void => {
    pick(next);
    close();
  };
}

function drillProps(
  props: ChoiceProps,
  value: string,
): Omit<ComponentProps<typeof Drill>, 'children'> {
  return {
    label: props.label,
    value,
    title: `Select ${props.label}`,
    keepOpen: props.keepOpen,
  };
}

function Choices(props: ChoicesProps): ReactElement {
  return (
    <List appearance="plain" fit>
      <List.Section
        selectionMode="single"
        selection={[props.value]}
        onSelectionChange={([next = props.value]) => props.pick(next)}
      >
        {props.choices.map((choice) => (
          <ListItem key={choice} id={choice} title={choice} />
        ))}
      </List.Section>
    </List>
  );
}
