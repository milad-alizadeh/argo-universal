import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { useWide } from '../../../use-wide/use-wide';
import { cn } from '../../../utils';
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
  loadingLabel: 'Loading Projects…',
  footerAction: { label: 'Add a Project', icon: 'add', onPress: () => {} },
} as const;

type ExampleProps = Partial<ComboboxProps<Project>> & { initialQuery?: string };

/*
 * The options as the popover or sheet draws them, open, so each state shows at once. A phone's
 * native list fills the height it is given, as a sheet's does, so the frame has one.
 */
function OpenExample(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState<Project>('argo');
  const wide = useWide();

  return (
    <View className={exampleFrame(wide)}>
      <ComboboxContent
        {...projectSearch}
        {...props}
        wide={wide}
        value={value}
        onChoose={setValue}
      />
    </View>
  );
}

const exampleFrame = (wide: boolean): string =>
  cn('w-full max-w-80 overflow-hidden rounded-surface shadow-card bg-card', {
    'h-96': !wide,
  });

function TriggerExample(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState<Project>('argo');

  return (
    <Combobox
      {...projectSearch}
      {...props}
      value={value}
      onValueChange={setValue}
    />
  );
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

// The trigger opens the popover or sheet itself, loading as when the Projects are still coming.
const triggers: readonly { label: string; props: ExampleProps }[] = [
  { label: 'Trigger', props: {} },
  { label: 'Trigger, loading', props: { loading: true } },
];

function exampleVariation(
  Example: (props: ExampleProps) => React.JSX.Element,
): (state: { label: string; props: ExampleProps }) => React.JSX.Element {
  return (state) => (
    <Variation key={state.label} label={state.label}>
      <Example {...state.props} />
    </Variation>
  );
}

function ComboboxVariations(): React.JSX.Element {
  return (
    <VariationList>
      {triggers.map(exampleVariation(TriggerExample))}
      {states.map(exampleVariation(OpenExample))}
    </VariationList>
  );
}

export const Variations: Story = {
  name: 'Combobox',
  render: () => <ComboboxVariations />,
};
