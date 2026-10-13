import { fn, expect, within, waitFor } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { canPointAt } from '../point-hit';
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
  pressedAttribute,
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
        agents: [catalog.agent],
        agent: catalog.agent.agent,
        configOptions: catalog.agent.configOptions,
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
      },
      status: {
        subagents: { count: 2, running: false, onPress: fn() },
        shells: { count: 1, running: shellsRunning, onPress: fn() },
      },
    },
    play: async ({ canvas }) => {
      await settleViewport(layoutWidths.phone);
      const subagents = canvas.getByRole('button', {
        name: subagentCountLabel,
      });
      const shells = canvas.getByRole('button', { name: 'Shells: 1' });
      await expect(subagents).toBeVisible();
      await expect(shells).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Agents: 2' }),
      ).not.toBeInTheDocument();
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
  await expect(within(context).getByText('34k')).not.toBeVisible();
  await expect(within(context).getByText('/ 200k')).not.toBeVisible();
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
  const used = within(context).getByText('34k').getBoundingClientRect();
  const size = within(context).getByText('/ 200k').getBoundingClientRect();
  await expect(size.left).toBeGreaterThanOrEqual(used.right);
}
export async function expectWideAgentMenu(): Promise<void> {
  await waitFor(expectHeldAgentList);
}
export async function expectHeldAgentList(): Promise<void> {
  const agents = await within(document.body).findAllByRole('button', {
    name: /^Select /,
  });
  for (const agent of agents) await expect(agent).toBeDisabled();
  await expect(
    agents.filter((agent) => agent.getAttribute(pressedAttribute) === 'true'),
  ).toHaveLength(1);
}
export const linesTwoToTen =
  '\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';
export async function expectSendUnobscured(send: HTMLElement): Promise<void> {
  await expect(canPointAt(send)).toBe(true);
}
