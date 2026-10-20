import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { Variation, Variations as VariationList } from '../../../variations';
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

const meta = {
  title: 'Design System/Primitives/Inputs/Combobox',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'Combobox',
  render: () => <ComboboxExamples />,
};

const states = [
  { label: 'Loading', loading: true },
  { label: 'Empty' },
  { label: 'Could not load', loadError: 'Folders could not be loaded.' },
];

const examples = [
  { label: 'Searchable choice', example: <ProjectChoice /> },
  { label: 'Row', example: <ProjectSheet /> },
  ...states.map(({ label, ...state }) => ({
    label,
    example: <StatusExample {...state} />,
  })),
];

function ComboboxExamples(): ReactElement {
  return (
    <VariationList>
      {examples.map(({ label, example }) => (
        <Variation key={label} label={label}>
          {example}
        </Variation>
      ))}
    </VariationList>
  );
}

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

function ProjectChoice(): ReactElement {
  const [value, setValue] = useState('long');

  return (
    <Combobox
      label="Folder"
      value={value}
      options={options}
      searchPlaceholder="Find a folder…"
      onValueChange={setValue}
    />
  );
}

// The row variant lives in a menu or sheet: it opens beside the menu on a desktop and pushes a page of the sheet on a phone.
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
