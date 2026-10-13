import { expect, within } from 'storybook/test';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import type { PlayContext } from './composer-story-context.test.mocks';
import {
  chooseAgentLabel,
  chooseModelLabel,
  subagentCountLabel,
} from './composer-test-contract.test.mocks';
import {
  expectPhoneFooter,
  expectWideFooter,
  expectHeldAgentList,
  expectWideAgentMenu,
} from './work-status.test.mocks';
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
  if (width < wideBreakpoint()) {
    const chooseAgent = await within(document.body).findByRole('button', {
      name: chooseAgentLabel,
    });
    await expect(chooseAgent).toBeEnabled();
    await userEvent.click(chooseAgent);
    await expectHeldAgentList();
    await userEvent.click(
      await within(document.body).findByRole('button', {
        name: 'Back to Configure',
      }),
    );
    await userEvent.click(
      await within(document.body).findByRole('button', {
        name: chooseModelLabel,
      }),
    );
    await userEvent.click(
      await within(document.body).findByRole('button', {
        name: 'Back to Configure',
      }),
    );
    await expect(
      await within(document.body).findByRole('slider', { name: 'Effort' }),
    ).toBeVisible();
  } else {
    await userEvent.click(
      await within(document.body).findByRole('button', {
        name: chooseAgentLabel,
      }),
    );
    await expectWideAgentMenu();
    await userEvent.keyboard('{Escape}');
  }
}
