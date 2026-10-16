import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import { expect, within, waitFor } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { idleSession } from '../../src/screens/sessions/$id/session-detail-view.mocks';
import { idleConfiguration, type Story } from './session-view-story.test.mocks';

export function configuration(agentIndex: 0 | 1): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];

  if (!agent) throw new Error('Recorded catalog needs two Agents');

  return {
    args: {
      view: {
        state: 'open',
        ...idleSession,
        composer: {
          ...idleSession.composer,
          configuration: {
            ...idleConfiguration(),
            agent,
            configOptions: recordedSessionOptions(agent.id),
          },
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Agent and model' }),
      );
      await waitFor(() =>
        expect(
          within(document.body).getByRole('group', {
            name: `Agent, ${agent.name}`,
          }),
        ).toBeVisible(),
      );
      await expect(
        within(document.body).queryByRole('button', { name: /Select .*Agent/ }),
      ).not.toBeInTheDocument();
    },
  };
}
