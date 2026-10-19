import { recordedSessionOptions } from '@repo/mocks/app';
import { fn, expect } from 'storybook/test';
import { Composer } from '../../src/features/composer/components/composer/composer';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { composerProps } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import {
  missingAvailableAgentFailure,
  agentModelLabel,
} from './composer-test-contract.test.mocks';
import { pickerCatalogs } from './recorded-catalog.test.mocks';
import {
  composerCard,
  expectResponsiveFooter,
  browseResponsiveMenu,
} from './responsive-menu.test.mocks';

export function responsiveLayout(width: number, agentIndex: number): Story {
  const catalog = pickerCatalogs[agentIndex];

  if (!catalog) throw new Error(missingAvailableAgentFailure);

  return {
    args: {
      configuration: {
        agent: catalog.agent,
        configOptions: recordedSessionOptions(catalog.agent.id),
        onConfigChange: fn(),
        checkout: {
          branch: 'main',
          newWorktree: false,
          path: '/Developer/project/.worktrees/session',
        },
      },
    },
    render: (args) => (
      <Composer {...composerProps({ ...args, sessionStarted: true })} />
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      const card = composerCard(input);

      const attachButton = canvas.getByRole('button', {
        name: 'Attach',
      });

      await expect(attachButton).toBeVisible();
      const trigger = canvas.getByRole('button', { name: agentModelLabel });
      await expect(trigger).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Mode' })).toBeVisible();
      await expectResponsiveFooter({ canvas, card, width });
      await userEvent.click(trigger);
      await browseResponsiveMenu({
        userEvent,
        width,
        agent: catalog.agent.name,
      });
      await userEvent.keyboard('{Escape}');
    },
  };
}
