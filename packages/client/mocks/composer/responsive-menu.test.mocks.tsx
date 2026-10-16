import { expect, waitFor, within } from 'storybook/test';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import type { PlayContext } from './composer-story-context.test.mocks';
import {
  chooseAgentLabel,
  chooseModelLabel,
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

export async function browseResponsiveMenu({
  userEvent,
  width,
}: Pick<PlayContext, 'userEvent'> & { width: number }): Promise<void> {
  const overlay = within(document.body);
  await waitFor(() =>
    expect(
      overlay.getByRole('group', { name: chooseAgentLabel }),
    ).toBeVisible(),
  );
  await expect(
    overlay.queryByRole('button', { name: chooseAgentLabel }),
  ).not.toBeInTheDocument();
  await userEvent.click(
    await overlay.findByRole('button', { name: chooseModelLabel }),
  );

  if (width < wideBreakpoint()) {
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Back to Configure' }),
    );
    await expect(
      await overlay.findByRole('slider', { name: 'Effort' }),
    ).toBeVisible();
  } else {
    await waitFor(() =>
      expect(
        overlay.getByRole('dialog', { name: 'Select Model' }),
      ).toBeVisible(),
    );
    await userEvent.keyboard('{Escape}');
  }
}
