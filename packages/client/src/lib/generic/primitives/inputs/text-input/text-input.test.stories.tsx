import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { FieldSection } from '#primitives/fields/field-section';
import { settleViewport } from '../../../settle-viewport';
import { TextInput } from './text-input';

const label = 'Executable';

const failure = 'One path or command, without spaces.';

type Appearance = 'standalone' | 'row';

type ExampleProps = {
  appearance: Appearance;
  onChangeText: (value: string) => void;
  errors?: string[];
  disabled?: boolean;
};

function Example(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState('');

  return (
    <TextInput
      {...props}
      label={label}
      value={value}
      onChangeText={(next) => {
        setValue(next);
        props.onChangeText(next);
      }}
    />
  );
}

const meta = {
  title: 'Tests/TextInput',
  component: Example,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  args: { appearance: 'standalone', onChangeText: fn() },
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

function typesIn(appearance: Appearance): Story {
  return {
    args: { appearance },
    play: async ({ canvas, userEvent, args }) => {
      const field = canvas.getByRole('textbox', { name: label });
      await userEvent.type(field, 'acp');
      await expect(field).toHaveValue('acp');
      await expect(field).not.toBeInvalid();
      await expect(args.onChangeText).toHaveBeenLastCalledWith('acp');
    },
  };
}

export const StandaloneTypes = typesIn('standalone');

export const RowTypes = typesIn('row');

function marksInvalidIn(appearance: Appearance): Story {
  return {
    args: { appearance, errors: [failure] },
    play: async ({ canvas }) => {
      await expect(canvas.getByRole('textbox', { name: label })).toBeInvalid();
    },
  };
}

export const StandaloneMarksInvalid = marksInvalidIn('standalone');

export const RowMarksInvalid = marksInvalidIn('row');

// A row's error shows in its section's footer, which the field names as its description.
function InSection(props: ExampleProps): React.JSX.Element {
  if (props.appearance === 'standalone') return <Example {...props} />;

  return (
    <FieldSection footer={failure} footerTone="destructive" textFields>
      <Example {...props} />
    </FieldSection>
  );
}

function describesErrorIn(appearance: Appearance): Story {
  return {
    args: { appearance, errors: [failure] },
    render: InSection,
    play: async ({ canvas }) => {
      await expect(
        canvas.getByRole('textbox', { name: label }),
      ).toHaveAccessibleDescription(failure);
    },
  };
}

export const StandaloneDescribesError = describesErrorIn('standalone');

export const RowDescribesError = describesErrorIn('row');

function lockedIn(appearance: Appearance): Story {
  return {
    args: { appearance, disabled: true },
    play: async ({ canvas }) => {
      await expect(
        canvas.getByRole('textbox', { name: label }),
      ).toHaveAttribute('readonly');
    },
  };
}

export const StandaloneDisabled = lockedIn('standalone');

export const RowDisabled = lockedIn('row');

export const BareTypes: Story = {
  render: function Bare(props): React.JSX.Element {
    const [value, setValue] = useState('');

    return (
      <TextInput
        appearance="bare"
        accessibilityLabel={label}
        value={value}
        onChangeText={(next) => {
          setValue(next);
          props.onChangeText(next);
        }}
      />
    );
  },
  play: async ({ canvas, userEvent, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'acp');
    await expect(field).toHaveValue('acp');
    await expect(args.onChangeText).toHaveBeenLastCalledWith('acp');
  },
};
