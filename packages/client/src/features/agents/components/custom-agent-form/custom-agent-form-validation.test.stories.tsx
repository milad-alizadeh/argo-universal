import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, type Mock, waitFor, within } from 'storybook/test';
import {
  type LeaveGuard,
  NavigationProvider,
} from '#lib/product/navigation/context';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import type { SubmitCustomAgent } from '../../hooks/use-custom-agent-form';
import { registers } from '../custom-agent.mocks';
import { CustomAgentForm } from './custom-agent-form';

const meta = {
  title: 'Tests/Screens/Settings/Add custom Agent validation',
  component: CustomAgentForm,
  args: { submitLabel: 'Add Agent', onSubmit: registers(), onCancel: fn() },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof CustomAgentForm>;
export default meta;
type Story = StoryObj<typeof meta>;

// A check that has not answered yet: the Server is still running the program.
const neverAnswers = (): Mock<SubmitCustomAgent> =>
  fn<SubmitCustomAgent>(() => new Promise<never>(() => null));

export const DisablesSubmitWhileChecking: Story = {
  args: { onSubmit: neverAnswers() },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Name'), 'Example ACP');
    await userEvent.type(canvas.getByLabelText('Executable'), 'example-acp');
    const submit = canvas.getByRole('button', { name: 'Add Agent' });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toBeDisabled());
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

export const AnnouncesAnErrorWithItsField: Story = {
  play: async ({ canvas, userEvent }) => {
    const executable = canvas.getByLabelText('Executable');
    await userEvent.type(executable, 'example-acp --acp');
    await waitFor(() => expect(executable).toBeInvalid());
    await expect(executable).toHaveAccessibleDescription(
      'One path or command, without spaces. Put arguments below.',
    );
    await expect(canvas.getByLabelText('Name')).toHaveAccessibleDescription('');
  },
};

// The page's back action, as the router offers it: held while the guard is active, else it just goes.
type Blocked = Parameters<LeaveGuard>[1];
const leaving: { blocked: Blocked | null } = { blocked: null };
const guarded: LeaveGuard = (active, onBlocked) => {
  leaving.blocked = active ? onBlocked : null;
};
const goBack = fn();

export const AsksBeforeLeavingATouchedForm: Story = {
  decorators: [
    (Story) => (
      <NavigationProvider navigate={fn()} leaveGuard={guarded}>
        <Story />
      </NavigationProvider>
    ),
  ],
  play: async ({ canvas, userEvent }) => {
    await expect(leaving.blocked).toBeNull();
    await userEvent.type(canvas.getByLabelText('Name'), 'Example ACP');
    await waitFor(() => expect(leaving.blocked).not.toBeNull());
    leaving.blocked?.(goBack);
    const alert = within(document.body);
    await userEvent.click(
      await alert.findByRole('button', { name: 'Keep editing' }),
    );
    await expect(goBack).not.toHaveBeenCalled();
    leaving.blocked?.(goBack);
    await userEvent.click(
      await alert.findByRole('button', { name: 'Discard' }),
    );
    await expect(goBack).toHaveBeenCalledTimes(1);
  },
};
