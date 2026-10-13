import type { AgentInfo } from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import { expect, fn, waitFor, within } from 'storybook/test';
import { idleSession } from '../../src/features/sessions/components/session-view/session-view.mocks';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  idleConfiguration,
  openProps,
  type Story,
} from './session-view-story.test.mocks';

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

function idleSessionWith(
  configuration: Partial<ReturnType<typeof idleConfiguration>>,
): Story['args'] {
  return {
    view: {
      state: 'open',
      ...idleSession,
      composer: {
        ...idleSession.composer,
        configuration: { ...idleConfiguration(), ...configuration },
      },
    },
  };
}

async function openAgentRow(
  { canvas, userEvent }: PlayContext,
  agent: AgentInfo,
): Promise<HTMLElement> {
  await settleViewport(layoutWidths.wide);
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Agent and model' }),
  );
  const overlay = within(document.body);
  await userEvent.click(
    await overlay.findByRole('button', { name: /^Agent,/ }),
  );
  const row = await overlay.findByRole('button', {
    name: `Select ${agent.label}`,
  });
  await waitFor(() => expect(row).toBeVisible());
  return row;
}

function unavailableAgent(agentIndex: 0 | 1): AgentInfo & {
  installStep: string;
} {
  const agent = newSessionCatalogs.bothUnavailable[agentIndex];
  if (!agent?.installStep)
    throw new Error('Recorded catalog needs two unavailable Agents.');
  return { ...agent, installStep: agent.installStep };
}

// A started Session's Agent became unavailable: its row says why and Retry asks again.
export function agentUnavailable(agentIndex: 0 | 1): Story {
  const agent = unavailableAgent(agentIndex);
  return {
    args: idleSessionWith({
      agents: newSessionCatalogs.bothUnavailable,
      agent: agent.agent,
      configOptions: agent.configOptions,
      onAgentRetry: fn(),
    }),
    play: async (context) => {
      const row = await openAgentRow(context, agent);
      await expect(row).toBeDisabled();
      await expect(row).toHaveTextContent(agent.installStep);
      await context.userEvent.click(
        within(document.body).getByRole('button', {
          name: `Retry ${agent.label}`,
        }),
      );
      await expect(
        openProps(context.args.view).composer.configuration?.onAgentRetry,
      ).toHaveBeenCalledOnce();
    },
  };
}

function availableAgent(agentIndex: 0 | 1): AgentInfo {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!agent) throw new Error('Recorded catalog needs two Agents.');
  return agent;
}

// The Session's own Agent shows in the Composer's picker, and a started Session keeps it.
export function configuration(agentIndex: 0 | 1): Story {
  const agent = availableAgent(agentIndex);
  return {
    args: idleSessionWith({
      agent: agent.agent,
      configOptions: agent.configOptions,
    }),
    play: async (context) => {
      const current = await openAgentRow(context, agent);
      // A started Session keeps its Agent.
      await expect(current).toBeDisabled();
    },
  };
}
