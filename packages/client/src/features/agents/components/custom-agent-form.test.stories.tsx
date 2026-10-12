import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { CustomAgentForm } from './custom-agent-form';
import {
  customAgentDefinition,
  customAgentFailure,
  failsItsCheck,
  registers,
} from './custom-agent.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Add custom Agent',
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

// Every width adds an argument in its editor: a sheet on a phone, a dialog on a wide window.
async function addArgument(
  canvas: Canvas,
  userEvent: UserEvent,
): Promise<void> {
  await userEvent.click(canvas.getByRole('link', { name: 'Add argument' }));
  const editor = within(
    await within(document.body).findByRole('dialog', { name: 'Argument' }),
  );
  await userEvent.type(
    editor.getByRole('textbox', { name: 'Argument' }),
    '--acp',
  );
  await userEvent.click(editor.getByRole('button', { name: 'Save' }));
  await expect(
    await canvas.findByRole('link', { name: '--acp' }),
  ).toBeVisible();
}

function registersAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ args, canvas, userEvent }) => {
      const submit = canvas.getByRole('button', addAgent);
      await expect(submit).toBeDisabled();
      await fillProgram(canvas, userEvent);
      await addArgument(canvas, userEvent);
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

// An empty field shows an example value, so it reads as a place to type.
export const ShowsExamplesInEmptyFields: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Name')).toHaveAttribute(
      'placeholder',
      'Example Agent',
    );
    await expect(canvas.getByLabelText('Executable')).toHaveAttribute(
      'placeholder',
      '/usr/local/bin/example-agent',
    );
  },
};

export const RegistersOnPhone: Story = registersAt('phone');
export const RegistersOnDesktop: Story = registersAt('wide');

// The phone edits a variable in a sheet that the backdrop closes: Save and Remove, no Cancel or close button.
export const RemovesAVariableInASheetOnPhone: Story = {
  args: { initial: customAgentDefinition, submitLabel: 'Save' },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
  play: async ({ canvas, userEvent }) => {
    const variable = { name: /^EXAMPLE_HOME,/ };
    await userEvent.click(canvas.getByRole('link', variable));
    const sheet = within(
      await within(document.body).findByRole('dialog', {
        name: 'Environment variable',
      }),
    );
    await expect(sheet.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(
      sheet.queryByRole('button', { name: /^(Cancel|Close)$/ }),
    ).toBeNull();
    await userEvent.click(
      sheet.getByRole('button', { name: 'Remove variable' }),
    );
    await waitFor(() =>
      expect(canvas.queryByRole('link', variable)).toBeNull(),
    );
  },
};

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
      canvas.getByRole('link', { name: 'Add environment variable' }),
    );
    const editor = within(
      await within(document.body).findByRole('dialog', {
        name: 'Environment variable',
      }),
    );
    await userEvent.type(
      editor.getByRole('textbox', { name: 'Name' }),
      'API_KEY',
    );
    await expect(
      await editor.findByText(
        'Argo does not store credentials. Sign in through the Agent instead.',
      ),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(await canvas.findByRole('button', addAgent)).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
