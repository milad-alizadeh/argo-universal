import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
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

const addAgentLabel = 'Add a new agent';
const listed = newSessionCatalogs.bothAvailable;
const [first] = listed;
if (!first) throw new Error('Recorded catalog needs an available Agent.');

const configuration = (
  onAddAgent: () => void,
  onAgentChange: () => void,
): Configuration => ({
  agents: listed,
  agent: first.agent,
  configOptions: recordedSessionOptions(first.agent),
  onConfigChange: fn(),
  onAgentChange,
  onAddAgent,
  checkout: { branch: 'main', newWorktree: false },
});

// The picker's last row closes the menus and leaves to add an Agent, without choosing one.
export function addNewAgent(width: number): Story {
  const onAddAgent = fn();
  const onAgentChange = fn();
  return {
    beforeEach: () => {
      onAddAgent.mockClear();
      onAgentChange.mockClear();
    },
    args: { configuration: configuration(onAddAgent, onAgentChange) },
    render: renderArgs,
    play: async (context) => {
      await settleViewport(width);
      await openAgentChoices(context);
      const add = await assertAddRowLast();
      await context.userEvent.click(add);
      await waitFor(() => expect(onAddAgent).toHaveBeenCalledOnce());
      await expect(
        within(document.body).queryByRole('dialog', { name: agentModelLabel }),
      ).not.toBeInTheDocument();
      await expect(onAgentChange).not.toHaveBeenCalled();
    },
  };
}

async function openAgentChoices(context: PlayContext): Promise<void> {
  const overlay = within(document.body);
  await context.userEvent.click(
    context.canvas.getByRole('button', { name: agentModelLabel }),
  );
  await context.userEvent.click(
    await overlay.findByRole('button', { name: chooseAgentLabel }),
  );
}

async function assertAddRowLast(): Promise<HTMLElement> {
  const overlay = within(document.body);
  const add = await overlay.findByRole('button', { name: addAgentLabel });
  await waitFor(() => expect(add).toBeVisible());
  const rows = overlay.getAllByRole('button', {
    name: /^Select |^Add a new agent$/,
  });
  await expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
    ...listed.map(({ label }) => `Select ${label}`),
    addAgentLabel,
  ]);
  return add;
}
