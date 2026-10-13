import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import type { AgentStatus } from '../../state/agent-status';
import { AgentDetailView } from './agent-detail-view';
import { agentDetailArgs, readyAgent } from './agent-detail.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agent readiness',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;
type Handler = 'onRecheck' | 'onSignIn' | 'onRepair';

const { name } = readyAgent;
type Expected = {
  status: AgentStatus;
  reason: string;
  chip: string;
  headline: string;
  footer: string;
  action?: { label: string; handler: Handler };
};

// Each status shows its chip, what the check observed and its one action, from the Server's reason.
const readiness = (expected: Expected): Story => ({
  args: {
    agent: { ...readyAgent, status: expected.status, reason: expected.reason },
  },
  play: async ({ args, canvas, userEvent }) => {
    for (const text of [expected.chip, expected.headline])
      await expect(canvas.getAllByText(text)[0]).toBeVisible();
    await expect(canvas.getByText(expected.footer)).toBeVisible();
    await expect(canvas.queryByText('Unavailable')).not.toBeInTheDocument();
    const { action } = expected;
    if (!action) return expectNoAction(canvas);
    await userEvent.click(canvas.getByText(action.label));
    await expect(args[action.handler]).toHaveBeenCalledOnce();
  },
});
async function expectNoAction(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
): Promise<void> {
  for (const label of ['Recheck', 'Sign in', 'Repair'])
    await expect(canvas.queryByText(label)).not.toBeInTheDocument();
}

export const CheckingHasNoAction = readiness({
  status: 'checking',
  reason: '',
  chip: 'Checking…',
  headline: 'Checking…',
  footer: `Argo is starting ${name} to see whether it is ready.`,
});

export const SignInNeededSignsIn = readiness({
  status: 'sign-in-needed',
  reason: 'The Agent requires sign-in.',
  chip: 'Sign-in needed',
  headline: 'Not signed in',
  footer: 'The Agent requires sign-in.',
  action: { label: 'Sign in', handler: 'onSignIn' },
});

export const AccountNotSupportedSignsInWithAnotherAccount = readiness({
  status: 'account-not-supported',
  reason: 'The Agent did not report a compatible subscription account.',
  chip: 'Account not supported',
  headline: `This account can’t use ${name}`,
  footer: 'The Agent did not report a compatible subscription account.',
  action: { label: 'Sign in with another account', handler: 'onSignIn' },
});

export const NotCompatibleNamesTheCapability = readiness({
  status: 'not-compatible',
  reason: `${name} does not support the ACP session/close capability Argo needs.`,
  chip: 'Not compatible',
  headline: 'Not compatible',
  footer: `${name} does not support the ACP session/close capability Argo needs.`,
});

export const CantStartShowsTheReasonAndRechecks = readiness({
  status: 'cant-start',
  reason: `${name} exited before answering ACP initialize.`,
  chip: 'Can’t start',
  headline: 'Can’t start',
  footer: `${name} exited before answering ACP initialize.`,
  action: { label: 'Recheck', handler: 'onRecheck' },
});

export const CouldntCheckIsNotAFailure = readiness({
  status: 'couldnt-check',
  reason: 'Readiness could not be determined.',
  chip: 'Couldn’t check',
  headline: 'Readiness could not be determined',
  footer: `The check did not finish. ${name} may still work.`,
  action: { label: 'Recheck', handler: 'onRecheck' },
});

export const NotFoundRepairs = readiness({
  status: 'not-found',
  reason: `The installed files of ${name} are missing. Repair installs them again.`,
  chip: 'Not found',
  headline: 'Program missing',
  footer: `The installed files of ${name} are missing. Repair installs them again.`,
  action: { label: 'Repair', handler: 'onRepair' },
});
