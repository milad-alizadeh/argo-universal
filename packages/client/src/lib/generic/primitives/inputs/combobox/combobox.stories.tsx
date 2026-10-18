import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { MenuTrigger } from '#primitives/overlays/menu';
import { Sheet } from '#primitives/overlays/sheet';
import { Variation, Variations as VariationList } from '../../../variations';
import { Combobox } from './combobox';

const options = [
  {
    value: 'argo',
    label: 'argo-universal',
    // A worktree's long path shows how a path shortens before the selected check.
    supporting:
      '~/Developer/worktrees/argo-universal/jovial-pelican/argo-universal',
    code: true,
    icon: 'folder',
  },
  {
    value: 'paper',
    label: 'paper-sync',
    supporting: '~/Developer/paper-sync',
    code: true,
    icon: 'folder',
  },
  {
    value: 'docs',
    label: 'docs-site',
    supporting: '~/Developer/docs-site',
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
  { label: 'Could not load', loadError: 'Projects could not be loaded.' },
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
        label="Projects"
        options={[]}
        onValueChange={() => {}}
      />
    </View>
  );
}

function ProjectChoice(): ReactElement {
  const [value, setValue] = useState('argo');

  return (
    <Combobox
      label="Project"
      value={value}
      options={options}
      searchPlaceholder="Find a Project…"
      onValueChange={setValue}
    />
  );
}

// The row variant lives in a menu or sheet: it opens beside the menu on a desktop and pushes a page of the sheet on a phone.
function ProjectSheet(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Sheet {...sheetPresentation} open={open} onOpenChange={setOpen}>
      <Sheet.Page name="new-session" title="New Session">
        <ProjectRow />
      </Sheet.Page>
    </Sheet>
  );
}

const sheetPresentation = {
  label: 'New Session',
  contentScrolls: true,
  trigger: <MenuTrigger label="New Session" />,
};

function ProjectRow(): ReactElement {
  const [value, setValue] = useState('argo');

  return (
    <GroupedList fit>
      <GroupedListSection>
        <Combobox {...rowPresentation} value={value} onValueChange={setValue} />
      </GroupedListSection>
    </GroupedList>
  );
}

const rowPresentation = {
  variant: 'row',
  label: 'Project',
  title: 'Select Project',
  options,
  searchPlaceholder: 'Find a Project…',
} as const;
