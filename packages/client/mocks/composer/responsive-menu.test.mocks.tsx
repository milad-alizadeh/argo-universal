import { wideBreakpoint } from '@repo/kit/each-layout';
import { expect, waitFor, within } from 'storybook/test';
import type { PlayContext } from './composer-story-context.test.mocks';
import {
  chooseAgentLabel,
  chooseModelLabel,
  agentModelLabel,
  subagentCountLabel,
} from './composer-test-contract.test.mocks';
import { expectPhoneFooter, expectWideFooter } from './work-status.test.mocks';

export function composerCard(input: HTMLElement): Element {
  const card = input.parentElement?.parentElement;

  if (!card) throw new Error('Composer card is missing.');

  return card;
}

export async function expectResponsiveFooter({
  canvas,
  card,
  width,
}: Pick<PlayContext, 'canvas'> & {
  card: Element;
  width: number;
}): Promise<void> {
  if (width < wideBreakpoint()) {
    const subagents = canvas.getByRole('button', {
      name: subagentCountLabel,
    });

    await expect(
      canvas.getByRole('button', { name: 'Shells: 1' }),
    ).toBeVisible();
    await expect(subagents).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Agents: 2' }),
    ).not.toBeInTheDocument();
    await expectPhoneFooter({ canvas, card });
  } else {
    await expect(
      canvas.queryByRole('button', { name: subagentCountLabel }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: 'Shells: 1' }),
    ).not.toBeInTheDocument();
    await expectWideFooter({ canvas });
  }
}

/*
 * A running Session's Agent is fixed, so Configure draws no Agent row at all: neither a choice to make nor a
 * line repeating what the page is already titled with. The phone still names its sheet.
 */
async function expectNoAgentRow(width: number): Promise<void> {
  const overlay = within(document.body);

  if (width < wideBreakpoint()) {
    await expect(
      await overlay.findByRole('heading', { name: agentModelLabel }),
    ).toBeVisible();
  }

  await waitFor(() =>
    expect(
      overlay.queryByRole('group', { name: chooseAgentLabel }),
    ).not.toBeInTheDocument(),
  );
  await expect(
    overlay.queryByRole('button', { name: chooseAgentLabel }),
  ).not.toBeInTheDocument();
}

export async function browseResponsiveMenu({
  userEvent,
  width,
}: Pick<PlayContext, 'userEvent'> & {
  width: number;
}): Promise<void> {
  const overlay = within(document.body);

  await expectNoAgentRow(width);
  await userEvent.click(
    await overlay.findByRole('button', { name: chooseModelLabel }),
  );

  if (width < wideBreakpoint()) {
    await userEvent.click(
      await overlay.findByRole('button', {
        name: `Back to ${agentModelLabel}`,
      }),
    );
    await expect(await overlay.findByRole('slider')).toBeVisible();
  } else {
    await waitFor(() =>
      expect(overlay.getByRole('dialog', { name: 'Model' })).toBeVisible(),
    );
    await userEvent.keyboard('{Escape}');
  }
}
