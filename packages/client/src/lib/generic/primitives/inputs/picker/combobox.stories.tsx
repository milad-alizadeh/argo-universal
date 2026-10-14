import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import { Variation, Variations as VariationList } from '../../../variations';
import { Combobox } from './combobox';
import { ComboboxContent } from './combobox-content';
import type { ComboboxProps } from './picker-props';

const projects = [
  {
    value: 'argo',
    label: 'argo-universal',
    supporting: '~/Developer/argo-universal',
    supportingCode: true,
    icon: 'folder',
  },
  {
    value: 'paper',
    label: 'paper-sync',
    supporting: '~/Developer/paper-sync',
    supportingCode: true,
    icon: 'folder',
  },
  {
    value: 'docs',
    label: 'docs-site',
    supporting: '~/Developer/docs-site',
    supportingCode: true,
    icon: 'folder',
  },
] as const;

type Project = (typeof projects)[number]['value'];

const projectSearch = {
  label: 'Project',
  options: projects,
  searchPlaceholder: 'Find a Project…',
  emptyLabel: 'No Project matches.',
  footerAction: { label: 'Add a Project', icon: 'add', onPress: () => {} },
} as const;

type ExampleProps = Partial<ComboboxProps<Project>> & { initialQuery?: string };

// The options as the popover or sheet draws them, open, so each state shows at once.
function OpenExample(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState<Project>('argo');

  return (
    <View className="w-full max-w-80 overflow-hidden rounded-surface shadow-card">
      <ComboboxContent
        {...projectSearch}
        {...props}
        wide={useWide()}
        value={value}
        onChoose={setValue}
      />
    </View>
  );
}

function TriggerExample(): React.JSX.Element {
  const [value, setValue] = useState<Project>('argo');

  return <Combobox {...projectSearch} value={value} onValueChange={setValue} />;
}

const meta = { title: 'Design System/Primitives/Combobox' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const states: readonly { label: string; props: ExampleProps }[] = [
  { label: 'Default', props: {} },
  { label: 'Typing', props: { initialQuery: 'sync' } },
  { label: 'Empty', props: { initialQuery: 'landing' } },
  { label: 'Loading', props: { loading: true } },
];

function ComboboxVariations(): React.JSX.Element {
  return (
    <VariationList>
      <Variation label="Trigger">
        <TriggerExample />
      </Variation>
      {states.map((state) => (
        <Variation key={state.label} label={state.label}>
          <OpenExample {...state.props} />
        </Variation>
      ))}
    </VariationList>
  );
}

export const Variations: Story = {
  name: 'Combobox',
  render: () => <ComboboxVariations />,
};
