import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldGroupContent } from '#primitives/fields/field-group-content';
import { FieldSection } from '#primitives/fields/field-section';
import { Variation, Variations as VariationList } from '../../../variations';
import { TextInput } from './text-input';
import type {
  BareTextInputProps,
  RowTextInputProps,
  StandaloneTextInputProps,
} from './text-input-props';

const meta = {
  title: 'Design System/Primitives/TextInput',
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
    <FieldGroup>
      <RowSection />
      <InvalidSection />
      <FieldSection title="Row disabled">
        <TypedRow label="Name" initial="Example ACP" disabled />
      </FieldSection>
      <FieldGroupContent>
        <OwnVariations />
      </FieldGroupContent>
    </FieldGroup>
  );
}

function RowSection(): React.JSX.Element {
  return (
    <FieldSection textFields title="Row" footer={pathHint}>
      <TypedRow label="Name" initial="Example ACP" />
      <TypedRow mono label="Executable" initial="example-acp" hint={pathHint} />
    </FieldSection>
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
    <FieldSection
      textFields
      title="Row invalid"
      footer={spaceError}
      footerTone="destructive"
    >
      <TypedRow {...invalidRow} />
    </FieldSection>
  );
}

type Typed<Props> = Omit<Props, 'value' | 'onChangeText' | 'appearance'> & {
  initial: string;
};

const standaloneExamples: (Typed<StandaloneTextInputProps> & {
  example: string;
})[] = [
  { example: 'Required', label: 'Title', initial: title, required: true },
  {
    example: 'Invalid',
    label: 'Estimate',
    initial: '12',
    numeric: true,
    errors: ['Enter a whole number from 1 to 8.'],
  },
  { example: 'Disabled', label: 'Title', initial: title, disabled: true },
];

const bareExamples: {
  label: string;
  props: Omit<BareTextInputProps, 'appearance'> & { 'aria-invalid'?: boolean };
}[] = [
  { label: 'Bare empty', props: { placeholder: 'Email' } },
  {
    label: 'Bare filled',
    props: { defaultValue: 'hello@example.com', placeholder: 'Email' },
  },
  { label: 'Bare read-only', props: { editable: false, placeholder: 'Email' } },
  {
    label: 'Bare invalid',
    props: { 'aria-invalid': true, placeholder: 'Email' },
  },
  { label: 'Bare muted', props: { variant: 'muted', placeholder: 'https://' } },
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
          <TextInput appearance="bare" accessibilityLabel={label} {...props} />
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
    <TextInput
      {...props}
      appearance="row"
      value={value}
      onChangeText={setValue}
    />
  );
}

function TypedStandalone({
  initial,
  ...props
}: Typed<StandaloneTextInputProps>): React.JSX.Element {
  const [value, setValue] = useState(initial);

  return <TextInput {...props} value={value} onChangeText={setValue} />;
}
