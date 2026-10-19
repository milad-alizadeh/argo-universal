import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Combobox } from '#primitives/inputs/combobox';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { Drill } from './drill';

const meta = {
  title: 'Design System/Primitives/Overlays/Drill',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = { name: 'Drill', render: () => <Configure /> };

const options = ['Apple', 'Banana', 'Cherry'].map((label) => ({
  value: label,
  label,
}));

const presentation = {
  label: 'Configure',
  contentScrolls: true,
  trigger: <MenuTrigger label="Configure" />,
};

function Configure(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Sheet {...presentation} open={open} onOpenChange={setOpen}>
      <Sheet.Page name="configure" title="Configure">
        <FruitField />
      </Sheet.Page>
    </Sheet>
  );
}

function FruitField(): ReactElement {
  const [value, setValue] = useState('Apple');

  return (
    <List appearance="grouped" fit>
      <ListSection>
        <FruitDrill value={value} onValueChange={setValue} />
      </ListSection>
    </List>
  );
}

type FruitProps = { value: string; onValueChange: (value: string) => void };

function FruitDrill(props: FruitProps): ReactElement {
  return (
    <Drill
      label="Fruit"
      value={props.value}
      title="Select Fruit"
      contentScrolls
    >
      {(close) => <FruitChoices {...props} onClose={close} />}
    </Drill>
  );
}

function FruitChoices(
  props: FruitProps & { onClose: () => void },
): ReactElement {
  return <Combobox.Content {...props} label="Fruit" options={options} />;
}
