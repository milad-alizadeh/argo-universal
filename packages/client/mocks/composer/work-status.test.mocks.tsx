import { canPointAt } from '@repo/kit/mocks/point-hit';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import { fn, expect, within } from 'storybook/test';
import {
  type Story,
  type PlayContext,
} from './composer-story-context.test.mocks';
import {
  missingAvailableAgentFailure,
  subagentCountLabel,
  agentModelLabel,
  agentIconId,
  contextWindowLabel,
} from './composer-test-contract.test.mocks';
import { pickerCatalogs } from './recorded-catalog.test.mocks';

export function workStatusCounts(
  agentIndex: number,
  shellsRunning: boolean,
): Story {
  const catalog = pickerCatalogs[agentIndex];

  if (!catalog) throw new Error(missingAvailableAgentFailure);

  return {
    args: {
      configuration: {
        agent: catalog.agent,
        configOptions: recordedSessionOptions(catalog.agent.id),
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
      },
      status: {
        subagents: { count: 2, running: false, onPress: fn() },
        shells: { count: 1, running: shellsRunning, onPress: fn() },
      },
    },
    play: async ({ canvas }) => {
      await settleLayout('phone');

      const subagents = canvas.getByRole('button', {
        name: subagentCountLabel,
      });

      const shells = canvas.getByRole('button', { name: 'Shells: 1' });
      await expect(subagents).toBeVisible();
      await expect(shells).toBeVisible();
    },
  };
}

export type FooterCheck = Pick<PlayContext, 'canvas'> & { card: Element };

export async function expectPhoneFooter({
  canvas,
  card,
}: FooterCheck): Promise<void> {
  const bounds = card.getBoundingClientRect();
  const trigger = canvas.getByRole('button', { name: agentModelLabel });
  await expect(within(trigger).queryAllByTestId(agentIconId)).toHaveLength(0);
  await expect(
    canvas.queryByRole('button', { name: 'Checkout' }),
  ).not.toBeInTheDocument();
  const context = canvas.getByRole('button', { name: contextWindowLabel });
  await expect(context).not.toHaveTextContent(/34k|200k/);

  const work = canvas
    .getByRole('button', { name: 'Shells: 1' })
    .getBoundingClientRect();

  await expect(work.right).toBeLessThan(bounds.right);
  await expect(
    canvas.queryByText('session', { exact: true }),
  ).not.toBeInTheDocument();
}

export async function expectWideFooter({
  canvas,
}: Pick<PlayContext, 'canvas'>): Promise<void> {
  const context = canvas.getByRole('button', { name: contextWindowLabel });
  await expect(context).toBeVisible();
  await expect(context).toHaveTextContent(/34k\s*\/\s*200k/);
}

export const linesTwoToTen =
  '\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';

export async function expectSendUnobscured(send: HTMLElement): Promise<void> {
  await expect(canPointAt(send)).toBe(true);
}
