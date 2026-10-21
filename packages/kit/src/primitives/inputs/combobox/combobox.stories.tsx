import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { List, ListSection } from '#primitives/lists/list';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { Combobox } from './combobox';

const options = [
  {
    value: 'long',
    label: 'long-folder-name',
    // A long path shows how a path shortens before the selected check.
    subtitle:
      '~/Folder/very/long/path/to/some/nested/location/long-folder-name',
    code: true,
    icon: 'folder',
  },
  {
    value: 'paper',
    label: 'second-folder',
    subtitle: '~/Folder/second-folder',
    code: true,
    icon: 'folder',
  },
  {
    value: 'docs',
    label: 'third-folder',
    subtitle: '~/Folder/third-folder',
    code: true,
    icon: 'folder',
  },
] satisfies React.ComponentProps<typeof Combobox>['options'];

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
  args: {
    label: 'Folder',
    value: 'long',
    options,
    searchPlaceholder: 'Find a folder…',
    onValueChange: (): void => {},
  },
  argTypes: kitArgTypes('Combobox'),
  render: (args): ReactElement => <Example {...args} />,
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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

export const Loading: Story = {
  render: (): ReactElement => <StatusExample loading />,
};

export const Empty: Story = {
  render: (): ReactElement => <StatusExample />,
};

export const CouldNotLoad: Story = {
  render: (): ReactElement => (
    <StatusExample loadError="Folders could not be loaded." />
  ),
};

// The choices themselves, drawn without their overlay, so a load state reads on the page.
function StatusExample(props: {
  loading?: boolean;
  loadError?: string;
}): ReactElement {
  return (
    <View className="native:h-64">
      <Combobox.Content
        {...props}
        label="Folders"
        options={[]}
        onValueChange={() => {}}
      />
    </View>
  );
}

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
        <Combobox {...rowPresentation} value={value} onValueChange={setValue} />
      </ListSection>
    </List>
  );
}

const rowPresentation = {
  variant: 'row',
  label: 'Folder',
  title: 'Select folder',
  options,
  searchPlaceholder: 'Find a folder…',
} as const;
