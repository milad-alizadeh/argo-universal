import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { Variation, Variations as VariationList } from '../../../variations';
import { TextInput } from './text-input';
import type {
  BareTextInputProps,
  RowTextInputProps,
  StandaloneTextInputProps,
} from './text-input-props';

const meta = {
  title: 'Design System/Primitives/Inputs/TextInput',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variations: Story = {
  name: 'TextInput',
  render: () => <VariationsExample />,
};

const pathHint = "An absolute path, or a command on the Server's PATH.";

const spaceError = 'One path or command, without spaces.';

const title = 'Drafts vanish after a reconnect';

function VariationsExample(): React.JSX.Element {
  return (
    <List appearance="grouped">
      <RowSection />
      <InvalidSection />
      <StateSections />
      <View>
        <OwnVariations />
      </View>
    </List>
  );
}

function StateSections(): React.JSX.Element {
  return (
    <>
      <ListSection title="Row disabled">
        <TypedRow label="Name" initial="Example ACP" disabled />
      </ListSection>
      <ListSection title="Row checking">
        <TypedRow mono label="Executable" initial="example-acp" loading />
      </ListSection>
    </>
  );
}

function RowSection(): React.JSX.Element {
  return (
    <ListSection title="Row" footer={pathHint}>
      <TypedRow label="Name" initial="Example ACP" />
      <TypedRow mono label="Executable" initial="example-acp" hint={pathHint} />
    </ListSection>
  );
}

const invalidRow = {
  mono: true,
  label: 'Executable',
  initial: 'example-acp --acp',
  errors: [spaceError],
};

function InvalidSection(): React.JSX.Element {
  return (
    <ListSection title="Row invalid" footer={spaceError} tone="danger">
      <TypedRow {...invalidRow} />
    </ListSection>
  );
}

type Typed<Props> = Omit<Props, 'value' | 'onChangeText' | 'variant'> & {
  initial: string;
};

type StandaloneExample = Typed<StandaloneTextInputProps> & { example: string };

const standaloneExamples: StandaloneExample[] = [
  { example: 'Required', label: 'Title', initial: title, required: true },
  {
    example: 'Invalid',
    label: 'Estimate',
    initial: '12',
    numeric: true,
    errors: ['Enter a whole number from 1 to 8.'],
  },
  { example: 'Disabled', label: 'Title', initial: title, disabled: true },
  { example: 'Checking', label: 'Folder', initial: '~/Code', loading: true },
];

type BareProps = Omit<BareTextInputProps, 'variant'>;

type BareExample = { label: string; props: BareProps };

const bareExamples: BareExample[] = [
  { label: 'Bare empty', props: { placeholder: 'Email' } },
  {
    label: 'Bare filled',
    props: { defaultValue: 'hello@example.com', placeholder: 'Email' },
  },
  { label: 'Bare read-only', props: { editable: false, placeholder: 'Email' } },
  { label: 'Bare invalid', props: { 'aria-invalid': true } },
  { label: 'Bare muted', props: { tone: 'muted', placeholder: 'https://' } },
  {
    label: 'Bare secure',
    props: { secureTextEntry: true, defaultValue: 'password' },
  },
];

// The standalone field and the bare box sit on their own, outside a section.
function OwnVariations(): React.JSX.Element {
  return (
    <VariationList>
      {standaloneExamples.map(({ example, ...props }) => (
        <Variation key={example} label={example}>
          <TypedStandalone {...props} />
        </Variation>
      ))}
      <BareVariations />
    </VariationList>
  );
}

function BareVariations(): React.JSX.Element {
  return (
    <>
      {bareExamples.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <TextInput variant="bare" accessibilityLabel={label} {...props} />
        </Variation>
      ))}
    </>
  );
}

function TypedRow({
  initial,
  ...props
}: Typed<RowTextInputProps>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return (
    <TextInput {...props} variant="row" value={value} onChangeText={setValue} />
  );
}

function TypedStandalone({
  initial,
  ...props
}: Typed<StandaloneTextInputProps>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <TextInput {...props} value={value} onChangeText={setValue} />;
}
