import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { TextInput } from './text-input';

const label = 'Executable';

type Variant = 'standalone';

type ExampleProps = {
  variant: Variant;
  onChangeText: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
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
  title: 'Tests/Design System/Primitives/Inputs/TextInput',
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

function marksInvalidIn(variant: Variant): Story {
  return {
    args: { variant, invalid: true },
    play: async ({ canvas }) => {
      await expect(canvas.getByRole('textbox', { name: label })).toBeInvalid();
    },
  };
}

export const StandaloneMarksInvalid = marksInvalidIn('standalone');

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

// While the value is checked, a spinner says so and the field still takes typing.
function checkingIn(variant: Variant): Story {
  return {
    args: { variant, loading: true },
    play: async ({ canvas, userEvent }) => {
      await expect(
        canvas.getByRole('progressbar', { name: `Checking ${label}` }),
      ).toBeInTheDocument();

      const field = canvas.getByRole('textbox', { name: label });

      await userEvent.type(field, 'acp');
      await expect(field).toHaveValue('acp');
    },
  };
}

export const StandaloneChecking = checkingIn('standalone');

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
