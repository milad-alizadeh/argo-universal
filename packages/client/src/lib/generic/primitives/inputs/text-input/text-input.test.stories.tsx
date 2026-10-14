import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { settleViewport } from '../../../settle-viewport';
import { TextInput } from './text-input';

const label = 'Executable';

const failure = 'One path or command, without spaces.';

type Variant = 'standalone' | 'row';

type ExampleProps = {
  variant: Variant;
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
  args: { variant: 'standalone', onChangeText: fn() },
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

function typesIn(variant: Variant): Story {
  return {
    args: { variant },
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

function marksInvalidIn(variant: Variant): Story {
  return {
    args: { variant, errors: [failure] },
    play: async ({ canvas }) => {
      await expect(canvas.getByRole('textbox', { name: label })).toBeInvalid();
    },
  };
}

export const StandaloneMarksInvalid = marksInvalidIn('standalone');

export const RowMarksInvalid = marksInvalidIn('row');

// A row's error shows in its section's footer, which the field names as its description.
function InSection(props: ExampleProps): React.JSX.Element {
  if (props.variant === 'standalone') return <Example {...props} />;

  return (
    <GroupedListSection footer={failure} tone="danger" textFields>
      <Example {...props} />
    </GroupedListSection>
  );
}

function describesErrorIn(variant: Variant): Story {
  return {
    args: { variant, errors: [failure] },
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

function lockedIn(variant: Variant): Story {
  return {
    args: { variant, disabled: true },
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
        variant="bare"
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
