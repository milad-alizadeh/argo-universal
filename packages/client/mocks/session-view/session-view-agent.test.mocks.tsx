import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { newSessionCatalogs, recordedSessionOptions } from '@repo/mocks/app';
import { expect, within, waitFor } from 'storybook/test';
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
      await settleLayout('wide');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Agent and model' }),
      );
      /*
       * A running Session's Agent is fixed: Configure opens on its settings alone, with neither a choice of
       * Agent nor a row naming the one it is already titled with.
       */
      await waitFor(() =>
        expect(
          within(document.body).getByRole('dialog', {
            name: 'Agent and model',
          }),
        ).toBeVisible(),
      );
      await expect(
        within(document.body).queryByRole('group', {
          name: `Agent, ${agent.name}`,
        }),
      ).not.toBeInTheDocument();
      await expect(
        within(document.body).queryByRole('button', { name: /Select .*Agent/ }),
      ).not.toBeInTheDocument();
    },
  };
}
