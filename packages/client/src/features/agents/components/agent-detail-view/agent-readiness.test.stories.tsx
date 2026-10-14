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

type Handler = 'onRecheck' | 'onSignIn' | 'onRepair' | 'onInstall' | 'onUpdate';

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const { name } = readyAgent;

type Expected = {
  status: AgentStatus;
  reason?: string;
  // The status names itself once, in the Status section.
  label: string;
  // The section's footer; null where the status says enough on its own.
  footer: string | null;
  action?: { label: string; handler: Handler };
};

const actionLabels = [
  'Recheck',
  'Sign in',
  'Sign in with another account',
  'Repair',
  'Install',
  'Update',
];

// The Status section is one row naming the status; the footer says why, then its one call to action.
const readiness = (expected: Expected): Story => ({
  args: {
    agent: { ...readyAgent, status: expected.status, reason: expected.reason },
  },
  play: async ({ args, canvas, userEvent }) => {
    await expectStatus(canvas, expected);
    await expectOnlyAction(canvas, expected.action?.label);
    const { action } = expected;

    if (!action) return;
    await userEvent.click(canvas.getByRole('button', { name: action.label }));
    await expect(args[action.handler]).toHaveBeenCalledOnce();
  },
});

async function expectStatus(canvas: Canvas, expected: Expected): Promise<void> {
  const heading = canvas.getByRole('heading', { name: 'Status' });
  await expect(heading).toBeVisible();
  const labels = canvas.getAllByText(expected.label);
  await expect(labels).toHaveLength(1);
  await expect(labels[0]).toBeVisible();
  await expect(canvas.queryByText('Unavailable')).not.toBeInTheDocument();
  // The section reads its title, the status, then the footer or nothing more.
  await expect(sectionText(heading)).toBe(
    `Status${expected.label}${expected.footer ?? ''}`,
  );
}

// The Status heading's section: its title view, then the section around it.
const sectionText = (heading: HTMLElement): string | null | undefined =>
  heading.parentElement?.parentElement?.textContent;

async function expectOnlyAction(
  canvas: Canvas,
  label: string | undefined,
): Promise<void> {
  for (const other of actionLabels.filter((each) => each !== label))
    await expect(
      canvas.queryByRole('button', { name: other }),
    ).not.toBeInTheDocument();
}

export const ReadyHasNoAction = readiness({
  status: 'ready',
  label: 'Ready',
  footer: null,
});

export const NotInstalledInstalls = readiness({
  status: 'not-installed',
  label: 'Not installed',
  footer: null,
  action: { label: 'Install', handler: 'onInstall' },
});

export const UpdateAvailableUpdates = readiness({
  status: 'update-available',
  label: 'Update available',
  footer: null,
  action: { label: 'Update', handler: 'onUpdate' },
});

export const CheckingHasNoAction = readiness({
  status: 'checking',
  label: 'Checking…',
  reason: '',
  footer: `Argo is starting ${name} to see whether it is ready.`,
});

export const SignInNeededSignsIn = readiness({
  status: 'sign-in-needed',
  label: 'Sign-in needed',
  reason: 'The Agent requires sign-in.',
  footer: 'The Agent requires sign-in.',
  action: { label: 'Sign in', handler: 'onSignIn' },
});

export const AccountNotSupportedSignsInWithAnotherAccount = readiness({
  status: 'account-not-supported',
  label: 'Account not supported',
  reason: 'The Agent did not report a compatible subscription account.',
  footer: 'The Agent did not report a compatible subscription account.',
  action: { label: 'Sign in with another account', handler: 'onSignIn' },
});

export const NotCompatibleNamesTheCapability = readiness({
  status: 'not-compatible',
  label: 'Not compatible',
  reason: `${name} does not support the ACP session/close capability Argo needs.`,
  footer: `${name} does not support the ACP session/close capability Argo needs.`,
});

export const CantStartShowsTheReasonAndRechecks = readiness({
  status: 'cant-start',
  label: 'Can’t start',
  reason: `${name} exited before answering ACP initialize.`,
  footer: `${name} exited before answering ACP initialize.`,
  action: { label: 'Recheck', handler: 'onRecheck' },
});

export const CouldntCheckIsNotAFailure = readiness({
  status: 'couldnt-check',
  label: 'Couldn’t check',
  reason: 'Readiness could not be determined.',
  footer: `The check did not finish. ${name} may still work.`,
  action: { label: 'Recheck', handler: 'onRecheck' },
});

export const NotFoundRepairs = readiness({
  status: 'not-found',
  label: 'Not found',
  reason: `The installed files of ${name} are missing. Repair installs them again.`,
  footer: `The installed files of ${name} are missing. Repair installs them again.`,
  action: { label: 'Repair', handler: 'onRepair' },
});

// A phone's summary carries no status either; the Status section still names it once.
export const CantStartOnAPhone: Story = {
  ...CantStartShowsTheReasonAndRechecks,
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
};
