import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn, waitFor, within } from 'storybook/test';
import { composerFastModeConfiguration } from '../composer-mock';
import {
  agentModelLabel,
  renderArgs,
  type Story,
  type PlayContext,
} from './common';

// Fast mode is a switch in the menu, and the trigger carries a bolt while it is on.
function fastMode(width: number): Story {
  return {
    args: {
      configuration: {
        ...composerFastModeConfiguration(false),
        onConfigChange: fn(),
      },
    },
    render: renderArgs,
    play: (context) => testFastMode(context, width),
  };
}

async function testFastMode(
  context: PlayContext,
  width: number,
): Promise<void> {
  await settleLayout(width);
  const trigger = context.canvas.getByRole('button', { name: agentModelLabel });
  await expect(
    within(trigger).queryByTestId('fast-mode-on'),
  ).not.toBeInTheDocument();
  await context.userEvent.click(trigger);
  const fast = await assertFastModeOff(context);
  await turnFastModeOn(context);
  await assertFastModeTabOrder(context, fast);
}

async function assertFastModeOff({ args }: PlayContext): Promise<HTMLElement> {
  const overlay = within(document.body);
  const fast = await overlay.findByRole('switch', { name: 'Fast mode' });
  await waitFor(() => expect(fast).toBeInTheDocument());
  await expect(fast).not.toBeChecked();
  await expect(args.configuration?.onConfigChange).not.toHaveBeenCalled();

  return fast;
}

async function turnFastModeOn({ userEvent, args }: PlayContext): Promise<void> {
  await userEvent.click(within(document.body).getByText('Fast mode'));
  await expect(args.configuration?.onConfigChange).toHaveBeenCalledOnce();
  await expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
    'fast',
    true,
  );
}

// Tab follows the rows: Effort first and Fast mode last, on every width (owner, 2026-10-24).
async function assertFastModeTabOrder(
  { userEvent }: PlayContext,
  fast: HTMLElement,
): Promise<void> {
  within(document.body).getByRole('slider', { name: 'Effort' }).focus();

  await userEvent.tab();
  await expect(fast).toHaveFocus();
  await userEvent.keyboard('{Escape}');
}

export const FastModeSwitchPhone = fastMode(layoutWidths.phone);

export const FastModeSwitchWide = fastMode(layoutWidths.wide);

export const FastModeOnMarksTrigger: Story = {
  args: { configuration: composerFastModeConfiguration(true) },
  render: renderArgs,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await expect(within(trigger).getByTestId('fast-mode-on')).toBeVisible();
  },
};
