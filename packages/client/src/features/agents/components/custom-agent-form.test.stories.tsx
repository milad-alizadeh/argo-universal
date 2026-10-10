import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { CustomAgentForm } from './custom-agent-form';
import {
  customAgentFailure,
  failsItsCheck,
  registers,
} from './custom-agent.mocks';

const meta = {
  title: 'Tests/CustomAgentScreen',
  component: CustomAgentForm,
  args: {
    submitLabel: 'Add Agent',
    onSubmit: registers(),
    onCancel: fn(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof CustomAgentForm>;
export default meta;
type Story = StoryObj<typeof meta>;
type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];
type UserEvent = Parameters<NonNullable<Story['play']>>[0]['userEvent'];
type Layout = keyof typeof layoutWidths;

const addAgent = { name: 'Add Agent' };
const exampleName = 'Example ACP';

async function fillProgram(
  canvas: Canvas,
  userEvent: UserEvent,
): Promise<void> {
  await userEvent.type(canvas.getByLabelText('Name'), exampleName);
  await userEvent.type(canvas.getByLabelText('Executable'), 'example-acp');
}

// The phone adds an argument through a sheet; desktop types it into an inline row.
async function addArgument(
  layout: Layout,
  canvas: Canvas,
  userEvent: UserEvent,
): Promise<void> {
  await userEvent.click(canvas.getByRole('button', { name: 'Add argument' }));
  if (layout === 'wide') {
    await userEvent.type(canvas.getByLabelText('Argument 1'), '--acp');
    return;
  }
  const sheet = within(document.body);
  await userEvent.type(
    await sheet.findByRole('textbox', { name: 'Argument' }),
    '--acp',
  );
  await userEvent.click(sheet.getByRole('button', { name: 'Save' }));
  await expect(
    await canvas.findByRole('button', { name: 'Edit --acp' }),
  ).toBeVisible();
}

function registersAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ args, canvas, userEvent }) => {
      const submit = canvas.getByRole('button', addAgent);
      await expect(submit).toBeDisabled();
      await fillProgram(canvas, userEvent);
      await addArgument(layout, canvas, userEvent);
      await waitFor(() => expect(submit).toBeEnabled());
      await userEvent.click(submit);
      await waitFor(() =>
        expect(args.onSubmit).toHaveBeenCalledWith({
          name: exampleName,
          executable: 'example-acp',
          args: ['--acp'],
          env: [],
        }),
      );
    },
  };
}

export const RegistersOnPhone: Story = registersAt('phone');
export const RegistersOnDesktop: Story = registersAt('wide');

export const ShowsTheFailedCheck: Story = {
  args: {
    onSubmit: failsItsCheck(),
  },
  play: async ({ canvas, userEvent }) => {
    await fillProgram(canvas, userEvent);
    await userEvent.click(canvas.getByRole('button', addAgent));
    await expect(await canvas.findByText('Check failed')).toBeVisible();
    await expect(canvas.getByText(customAgentFailure)).toBeVisible();
  },
};

export const RejectsShellLinesAndCredentials: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Name'), exampleName);
    await userEvent.type(
      canvas.getByLabelText('Executable'),
      'example-acp --acp',
    );
    await expect(
      await canvas.findByText(
        'One path or command, without spaces. Put arguments below.',
      ),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Add environment variable' }),
    );
    await userEvent.type(canvas.getByLabelText('Variable 1 name'), 'API_KEY');
    await expect(
      await canvas.findByText(
        'Argo does not store credentials. Sign in through the Agent instead.',
      ),
    ).toBeVisible();
    await expect(canvas.getByRole('button', addAgent)).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
