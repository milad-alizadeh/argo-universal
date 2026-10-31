import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import { expect, fn, within } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type {
  PlayContext,
  Story,
} from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import {
  agentModelLabel,
  missingAvailableAgentFailure,
} from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { pickerCatalogs } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { scaleControlType } from '../../../../../mocks/composer/scaled-type.test.mocks';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer/DynamicType' };

export default meta;

const [catalog] = pickerCatalogs;

if (!catalog) throw new Error(missingAvailableAgentFailure);

const composerArgs = {
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
};

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const boxOf = (element: Element): Box => element.getBoundingClientRect();

const spansAcross = (one: Box, other: Box): boolean =>
  one.left < other.right && other.left < one.right;

const spansDown = (one: Box, other: Box): boolean =>
  one.top < other.bottom && other.top < one.bottom;

const overlaps = (one: Box, other: Box): boolean =>
  spansAcross(one, other) && spansDown(one, other);

const holdsOnlyWords = (element: Element): boolean =>
  element.childNodes.length === 1 &&
  element.firstChild?.nodeType === Node.TEXT_NODE;

/*
 * Whether any line of words in a control is wider than the box drawn for it, which is what the browser's own
 * truncation reports: a pill narrowed past its own name no longer says what pressing it opens.
 */
const clipsItsWords = (control: HTMLElement): boolean =>
  [...control.querySelectorAll('*')]
    .filter(holdsOnlyWords)
    .some((words) => words.scrollWidth > words.clientWidth + 1);

async function expectWithin(
  control: HTMLElement,
  width: number,
): Promise<void> {
  const box = boxOf(control);

  await expect(box.left).toBeGreaterThanOrEqual(0);
  await expect(box.right).toBeLessThanOrEqual(width);
}

/*
 * One Composer at the largest text sizes: the tokens are raised on the story's own root for as long as the
 * story runs, and put back after it, so the next story reads the Composer at the reader's ordinary size.
 */
const atScaledType = (
  check: (context: PlayContext) => Promise<void>,
): Story => ({
  args: composerArgs,
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async (context): Promise<void> => {
    const restore = scaleControlType(context.canvasElement);

    try {
      await settleLayout(layoutWidths.phone);
      await check(context);
    } finally {
      restore();
    }
  },
});

/*
 * The Composer's own controls stay where a reader can reach them at the largest text sizes: each is drawn
 * inside the phone's width, Attach keeps its own box instead of being squeezed out of it and painted over the
 * pill beside it, and each pill stays wide enough for the words naming what it opens.
 */
export const ControlsStayReachableAtScaledType = atScaledType(
  async ({ canvas }) => {
    const attach = canvas.getByRole('button', { name: 'Attach' });
    const agent = canvas.getByRole('button', { name: agentModelLabel });
    const mode = canvas.getByRole('button', { name: 'Mode' });
    const send = canvas.getByRole('button', { name: 'Send' });

    for (const control of [attach, agent, mode, send])
      await expectWithin(control, layoutWidths.phone);

    await expect(overlaps(boxOf(attach), boxOf(agent))).toBe(false);
    await expect(clipsItsWords(agent)).toBe(false);
    await expect(clipsItsWords(mode)).toBe(false);
  },
);

// Mode still opens at the largest text sizes: the pill takes the press and its page comes up.
export const ModeOpensAtScaledType = atScaledType(
  async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
    await expect(
      await within(document.body).findByRole('heading', { name: 'Mode' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
);
