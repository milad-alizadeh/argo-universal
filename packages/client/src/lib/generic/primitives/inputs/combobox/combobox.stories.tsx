import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Combobox } from './combobox';

const options = [
  {
    value: 'argo',
    label: 'argo-universal',
    supporting: '~/Developer/argo-universal',
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

const meta = { title: 'Design System/Primitives/Combobox' } satisfies Meta;

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

function ComboboxExamples(): ReactElement {
  return (
    <VariationList>
      <Variation label="Searchable choice">
        <ProjectChoice />
      </Variation>
      {states.map(({ label, ...state }) => (
        <Variation key={label} label={label}>
          <StatusExample {...state} />
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
