import { type AgentServer } from '@repo/contracts';
import { layoutWidths, wideBreakpoint } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { recordedSessionOptions } from '@repo/mocks/app';
import { fn, expect, within } from 'storybook/test';
import { composerPlan } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import {
  subagentCountLabel,
  newCheckoutLabel,
} from './composer-test-contract.test.mocks';
import { firstAgent } from './recorded-catalog.test.mocks';

export function phoneStatusControls(agent: AgentServer): Story {
  return {
    args: {
      configuration: {
        agent,
        configOptions: recordedSessionOptions(agent.id),
        onConfigChange: fn(),
        checkout: {
          branch: 'main',
          newWorktree: true,
          onNewWorktreeChange: fn(),
        },
      },
      status: {
        plan: composerPlan,
        subagents: { count: 2, running: true, onPress: fn() },
        shells: { count: 1, running: false, onPress: fn() },
      },
    },
    play: async ({ canvas }) => {
      await settleViewport(layoutWidths.phone);
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Plan' })).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: subagentCountLabel }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Shells: 1' }),
      ).toBeVisible();
    },
  };
}

export function createdCheckoutIsReadOnly(width: number): Story {
  return {
    args: {
      configuration: {
        agent: firstAgent,
        configOptions: recordedSessionOptions(firstAgent.id),
        onConfigChange: fn(),
        checkout: {
          branch: 'main',
          newWorktree: true,
          path: '/Developer/project/.worktrees/created-worktree',
          onNewWorktreeChange: fn(),
        },
      },
    },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);

      if (width < wideBreakpoint()) {
        await expect(
          canvas.queryByText('created-worktree', { exact: true }),
        ).not.toBeInTheDocument();
      } else {
        const name = canvas.getByText('created-worktree', { exact: true });
        await expect(name).toBeVisible();
        await expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        await userEvent.click(name);
      }

      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('textbox', { name: 'Search branches' }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('switch', { name: newCheckoutLabel }),
      ).not.toBeInTheDocument();
      await expect(
        args.configuration?.checkout.onNewWorktreeChange,
      ).not.toHaveBeenCalled();
    },
  };
}
