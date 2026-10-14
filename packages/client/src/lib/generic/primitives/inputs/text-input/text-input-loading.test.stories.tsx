import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { TextInput } from './text-input';
import type { TextFieldProps } from './text-input-props';

type FieldProps = TextFieldProps & { variant: 'standalone' | 'row' };

function Field(props: FieldProps): React.JSX.Element {
  return <TextInput {...props} />;
}

const meta = {
  title: 'Tests/TextInput/Loading',
  component: Field,
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
  args: {
    variant: 'standalone',
    label: 'Executable',
    value: 'example-acp',
    onChangeText: fn(),
    loading: true,
  },
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

// While its value is checked, the field says it is busy and shows a spinner, and still takes typing.
function busyWhileLoading(variant: 'standalone' | 'row'): Story {
  return {
    args: { variant },
    play: async ({ canvas, userEvent, args }) => {
      const field = canvas.getByRole('textbox', { name: 'Executable' });

      await expect(field).toHaveAttribute('aria-busy', 'true');
      await expect(
        canvas.getByRole('progressbar', { name: 'Loading' }),
      ).toBeVisible();
      await userEvent.type(field, 'x');
      await expect(args.onChangeText).toHaveBeenCalled();
    },
  };
}

export const StandaloneLoading = busyWhileLoading('standalone');

export const RowLoading = busyWhileLoading('row');

// A settled field shows no spinner.
export const Settled: Story = {
  args: { variant: 'standalone', loading: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', { name: 'Executable' }),
    ).not.toHaveAttribute('aria-busy', 'true');
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
  },
};
