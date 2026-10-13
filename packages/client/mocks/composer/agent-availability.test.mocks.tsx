import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import { fn, expect, within } from 'storybook/test';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  type Story,
  type PlayContext,
} from './composer-story-context.test.mocks';
import {
  agentModelLabel,
  chooseAgentLabel,
} from './composer-test-contract.test.mocks';
import { firstAgent } from './recorded-catalog.test.mocks';
export function unavailableAgents(width: number): Story {
  return {
    args: {
      configuration: {
        agents: [
          ...newSessionCatalogs.oneNotInstalled,
          ...newSessionCatalogs.oneNotSignedIn,
        ].filter((entry) => entry.availability !== 'available'),
        agent: firstAgent.agent,
        configOptions: recordedSessionOptions(firstAgent.agent),
        onConfigChange: fn(),
        onAgentChange: fn(),
        onAgentSetup: fn(),
        checkout: { branch: 'main', newWorktree: true },
      },
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: agentModelLabel }),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: chooseAgentLabel }),
      );
      const agents = configuredAgents(args);
      await expect(agents).toHaveLength(2);
      for (const agent of agents) {
        await expect(
          await overlay.findByRole('button', { name: `Select ${agent.label}` }),
        ).toBeDisabled();
        await userEvent.click(
          await overlay.findByRole('button', { name: `Set up ${agent.label}` }),
        );
        await expect(setupCallback(args)).toHaveBeenLastCalledWith(agent.agent);
      }
      await expect(changeCallback(args)).not.toHaveBeenCalled();
      await userEvent.keyboard('{Escape}');
    },
  };
}
function configuredAgents(
  args: PlayContext['args'],
): NonNullable<PlayContext['args']['configuration']>['agents'] {
  return args.configuration?.agents ?? [];
}
function setupCallback(
  args: PlayContext['args'],
): NonNullable<PlayContext['args']['configuration']>['onAgentSetup'] {
  return args.configuration?.onAgentSetup;
}
function changeCallback(
  args: PlayContext['args'],
): NonNullable<PlayContext['args']['configuration']>['onAgentChange'] {
  return args.configuration?.onAgentChange;
}
