import { useState, type ComponentProps, type ReactElement } from 'react';
import { fn } from 'storybook/test';
import { FieldGroup } from '#primitives/fields/field-group';
import { MenuTrigger } from '#primitives/overlays/menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#primitives/overlays/popover';
import { Drill } from './drill';
import { Choices } from './drill-choices.mocks';

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
    <FieldGroup>
      <FieldGroup.Section>
        <Choice label="Fruit" choices={fruits} keepOpen />
        <Choice label="Vegetable" choices={vegetables} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

type ChoiceProps = { label: string; choices: string[]; keepOpen?: boolean };

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
      {(close) => (
        <Choices
          title={props.label}
          choices={props.choices}
          value={value}
          onPick={both(pick, close)}
        />
      )}
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
