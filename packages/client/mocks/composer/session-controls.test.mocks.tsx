import { settleLayout, wideBreakpoint } from '@repo/kit/mocks/story-layout';
import { fn, within, expect, waitFor } from 'storybook/test';
import { Composer } from '../../src/features/composer/components/composer/composer';
import { composerProps } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import {
  chooseAgentLabel,
  runningPlanStepLabel,
  contextWindowLabel,
} from './composer-test-contract.test.mocks';
import {
  expectSessionPath,
  expectOpenedPlan,
  closeRunningPlan,
} from './session-plan.test.mocks';

export function sessionControls(width: number): Story {
  const onCompact = fn();

  return {
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          running: true,
          onStop: args.onStop,
          status: {
            ...composerProps({ ...args, sessionStarted: true }).status,
            context: { used: 34_000, size: 200_000, onCompact },
          },
        })}
      />
    ),
    args: { onStop: fn() },
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleLayout(width);
      await expect(
        canvas.queryByRole('button', { name: 'Checkout' }),
      ).not.toBeInTheDocument();
      await expectSessionPath({ canvas, width });
      await expect(
        canvas.queryByRole('button', { name: chooseAgentLabel }),
      ).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
      await expectOpenedPlan({ canvas, width });

      const spinner = await overlay.findByRole('progressbar', {
        name: runningPlanStepLabel,
      });

      await expect(spinner).toBeVisible();
      await closeRunningPlan({ canvas, userEvent, width });
      await userEvent.click(
        await canvas.findByRole('button', { name: contextWindowLabel }),
      );
      await waitFor(() =>
        expect(overlay.getByText('Smart zone · below 20%')).toBeVisible(),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: 'Compact' }),
      );
      await expect(onCompact).toHaveBeenCalledOnce();
      await browseUsage({ canvas, userEvent, overlay, width });
      await expect(args.onStop).not.toHaveBeenCalled();
      const stop = await canvas.findByRole('button', { name: 'Stop' });
      await expect(stop).toBeEnabled();
      await expect(
        canvas.queryByRole('button', { name: 'Send' }),
      ).not.toBeInTheDocument();
      await userEvent.click(stop);
      await expect(args.onStop).toHaveBeenCalledOnce();
      await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
    },
  };
}

interface UsageBrowse {
  canvas: ReturnType<typeof within>;
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'];
  overlay: ReturnType<typeof within>;
  width: number;
}

/*
 * Usage is a desktop control: a phone's Composer row has no width for a second gauge beside the context mark, and
 * the limits are read on its page in Settings instead (owner, 2026-10-21).
 */
async function browseUsage(browse: UsageBrowse): Promise<void> {
  const { canvas, userEvent, overlay, width } = browse;

  if (width < wideBreakpoint()) {
    await expect(
      canvas.queryByRole('button', { name: 'Usage' }),
    ).not.toBeInTheDocument();

    return;
  }

  await userEvent.click(await canvas.findByRole('button', { name: 'Usage' }));
  await waitFor(() => expect(overlay.getByText('5-hour limit')).toBeVisible());
  await waitFor(() => expect(overlay.getByText('Weekly limit')).toBeVisible());
  await expect(
    overlay.queryByText('Every Session on this account counts.'),
  ).not.toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
}
