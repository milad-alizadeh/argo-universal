import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { Combobox } from './combobox';
import { defaultCombobox, rowCombobox } from './combobox-fixtures';

// A Combobox is controlled, so a story draws through a wrapper that keeps the selected value.
function Example({
  value: initial,
  ...props
}: React.ComponentProps<typeof Combobox>): ReactElement {
  const [value, setValue] = useState(initial);

  return <Combobox {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  title: 'Design System/Primitives/Inputs/Combobox',
  component: Combobox,
  args: { ...defaultCombobox, onValueChange: (): void => {} },
  argTypes: kitArgTypes('Combobox'),
  render: (args): ReactElement => <Example {...args} />,
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: defaultCombobox };

export const Row: Story = {
  render: (): ReactElement => <ProjectSheet />,
  parameters: {
    docs: {
      description: {
        story:
          'The row variant lives in a menu or sheet: it opens beside the menu on a desktop and pushes a page of the sheet on a phone.',
      },
    },
  },
};

function ProjectSheet(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Sheet {...sheetPresentation} open={open} onOpenChange={setOpen}>
      <Sheet.Page name="new-item" title="New item">
        <ProjectRow />
      </Sheet.Page>
    </Sheet>
  );
}

const sheetPresentation = {
  label: 'New item',
  contentScrolls: true,
  trigger: <MenuTrigger label="New item" />,
};

function ProjectRow(): ReactElement {
  const [value, setValue] = useState('long');

  return (
    <List appearance="grouped" fit>
      <ListSection>
        <Combobox {...rowCombobox} value={value} onValueChange={setValue} />
      </ListSection>
    </List>
  );
}
