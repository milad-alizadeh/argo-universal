import type { AgentInfo } from '@repo/contracts';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  agentModelLabel,
  chooseAgentLabel,
  type Configuration,
  type PlayContext,
  renderArgs,
  type Story,
} from './common';

const [ready, checked] = newSessionCatalogs.bothReady;
if (!ready || !checked) throw new Error('Recorded catalog needs two Agents.');
const pending: AgentInfo = { ...checked, status: 'checking' };
const pendingLabel = `Select ${checked.label}`;
const rowNames = /^Select |^Add a new agent$/;

// The play function finishes the Agent's check, as a saved Readiness arriving from the Server would.
const checks = new EventTarget();
const finishCheck = (): boolean => checks.dispatchEvent(new Event('ready'));

function useCheckedAgents(configuration: Configuration): Configuration {
  const [agents, setAgents] = useState(configuration.agents);
  useEffect(() => {
    const finish = (): void => setAgents(newSessionCatalogs.bothReady);
    checks.addEventListener('ready', finish);
    return (): void => checks.removeEventListener('ready', finish);
  }, []);
  return { ...configuration, agents };
}
function CheckingConfiguration(props: {
  configuration: Configuration;
}): React.JSX.Element {
  return renderArgs({
    disabled: false,
    configuration: useCheckedAgents(props.configuration),
  });
}

const configuration = (onAgentChange: () => void): Configuration => ({
  agents: [ready, pending],
  agent: ready.agent,
  configOptions: recordedSessionOptions(ready.agent),
  onConfigChange: fn(),
  onAgentChange,
  onAddAgent: fn(),
  checkout: { branch: 'main', newWorktree: false },
});

// A never-checked Agent keeps its place with a spinner and can be picked once it is Ready.
export function pendingAgent(width: number): Story {
  const onAgentChange = fn();
  return {
    beforeEach: () => {
      onAgentChange.mockClear();
    },
    args: { configuration: configuration(onAgentChange) },
    render: (args) => (
      <CheckingConfiguration configuration={args.configuration} />
    ),
    play: (context) => checkPendingAgent(context, width, onAgentChange),
  };
}

async function checkPendingAgent(
  context: PlayContext,
  width: number,
  onAgentChange: () => void,
): Promise<void> {
  await settleViewport(width);
  await openAgentChoices(context);
  const before = await assertPendingRow();
  finishCheck();
  const row = await assertReadyRow();
  await expect(rowLabels()).toEqual(before.labels);
  await expect(placeOf(row)).toEqual(before.place);
  await context.userEvent.click(row);
  await expect(onAgentChange).toHaveBeenCalledWith(checked?.agent);
}

async function openAgentChoices(context: PlayContext): Promise<void> {
  await context.userEvent.click(
    context.canvas.getByRole('button', { name: agentModelLabel }),
  );
  await context.userEvent.click(
    await within(document.body).findByRole('button', {
      name: chooseAgentLabel,
    }),
  );
}

// Layout heights, unaffected by the menu's entrance animation: the same before and after the check, so nothing jumps.
const placeOf = (row: HTMLElement): number[] => {
  const add = within(document.body).getByRole('button', {
    name: 'Add a new agent',
  });
  return [row.offsetHeight, add.offsetHeight];
};
const checkingSpinner = (row: HTMLElement): HTMLElement | null =>
  within(row).queryByRole('progressbar', { name: 'Checking…' });

const rowLabels = (): (string | null)[] =>
  within(document.body)
    .getAllByRole('button', { name: rowNames })
    .map((row) => row.getAttribute('aria-label'));

async function assertPendingRow(): Promise<{
  labels: (string | null)[];
  place: number[];
}> {
  const row = await within(document.body).findByRole('button', {
    name: pendingLabel,
  });
  await waitFor(() => expect(row).toBeVisible());
  await expect(row).toBeDisabled();
  await expect(checkingSpinner(row)).toBeInTheDocument();
  return { labels: rowLabels(), place: placeOf(row) };
}

async function assertReadyRow(): Promise<HTMLElement> {
  const row = within(document.body).getByRole('button', { name: pendingLabel });
  await waitFor(() => expect(row).toBeEnabled());
  await expect(checkingSpinner(row)).not.toBeInTheDocument();
  return row;
}
