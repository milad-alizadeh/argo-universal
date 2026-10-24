import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Sheet } from '#primitives/overlays/sheet';
import { configureSheet } from '../sheet/sheet-fixtures';
import { Drill } from './drill';
import { fruitDrill } from './drill-fixtures';
import type { DrillProps } from './drill-props';

/*
 * Drill has no Contracts schema, so its prop domain is written out from DrillProps. Its args only
 * satisfy the component's type: a drill draws inside an open sheet, so the story renders one.
 */
const args: DrillProps = {
  label: 'Fruit',
  title: 'Select Fruit',
  children: (): null => null,
};

const meta = {
  title: 'Design System/Primitives/Overlays/Drill',
  component: Drill,
  args,
  argTypes: {
    label: { control: 'text' },
    value: { control: false },
    valueLeading: { control: false },
    disabled: { control: 'boolean' },
    title: { control: 'text' },
    trigger: { control: false },
    contentScrolls: { control: 'boolean' },
    placeholder: { control: false },
    mount: { control: 'select', options: ['lazy', 'eager'] },
    onClose: { control: false },
    keepOpen: { control: 'boolean' },
    children: { control: false },
  },
} satisfies Meta<typeof Drill>;

export default meta;

type Story = StoryObj<typeof meta>;

// The row and the page it pushes, inside the sheet that holds them.
export const Default: Story = { render: (): ReactElement => <Configure /> };

const options = ['Apple', 'Banana', 'Cherry'].map((label) => ({
  value: label,
  label,
}));

function Configure(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Sheet {...configureSheet} open={open} onOpenChange={setOpen}>
      <Sheet.Screen name="configure" title="Configure">
        <FruitField />
      </Sheet.Screen>
    </Sheet>
  );
}

function FruitField(): ReactElement {
  const [value, setValue] = useState('Apple');

  return (
    <List appearance="plain" fit>
      <ListSection>
        <FruitDrill value={value} onValueChange={setValue} />
      </ListSection>
    </List>
  );
}

type FruitProps = { value: string; onValueChange: (value: string) => void };

function FruitDrill(props: FruitProps): ReactElement {
  return (
    <Drill {...fruitDrill} value={props.value}>
      {(close) => <FruitChoices {...props} onClose={close} />}
    </Drill>
  );
}

function FruitChoices(
  props: FruitProps & { onClose: () => void },
): ReactElement {
  return (
    <List appearance="plain" fit>
      <ListSection
        selectionMode="single"
        selection={[props.value]}
        onSelectionChange={([next = props.value]) => {
          props.onValueChange(next);
          props.onClose();
        }}
      >
        {options.map((option) => (
          <ListItem key={option.value} id={option.value} title={option.label} />
        ))}
      </ListSection>
    </List>
  );
}
