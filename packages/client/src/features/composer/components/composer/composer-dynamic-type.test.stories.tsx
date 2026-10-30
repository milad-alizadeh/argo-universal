import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import { expect, fn, within } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import {
  agentModelLabel,
  missingAvailableAgentFailure,
} from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { pickerCatalogs } from '../../../../../mocks/composer/recorded-catalog.test.mocks';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer/DynamicType' };

export default meta;

const [catalog] = pickerCatalogs;

if (!catalog) throw new Error(missingAvailableAgentFailure);

/*
 * The largest text sizes, as the Composer meets them. Dynamic Type raises the type tokens each kit role reads,
 * and the Composer's pills and Send are set in the control role, so the story raises that role's tokens on the
 * story's own root. iOS applies the reader's size itself; this pins what the layout does with it (#1529).
 */
const scaledControlType = {
  '--text-control': '36px',
  '--leading-control': '44px',
};

function scaleControlType(root: HTMLElement): () => void {
  for (const [token, size] of Object.entries(scaledControlType))
    root.style.setProperty(token, size);

  return (): void => {
    for (const token of Object.keys(scaledControlType))
      root.style.removeProperty(token);
  };
}

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
 * The Composer's own controls stay where a reader can reach them at the largest text sizes: each is drawn
 * inside the phone's width, Attach keeps its own box instead of being squeezed out of it and painted over the
 * pill beside it, and each pill stays wide enough for the words naming what it opens.
 */
export const ControlsStayReachableAtScaledType: Story = {
  args: composerArgs,
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas, canvasElement }) => {
    const restore = scaleControlType(canvasElement);

    try {
      await settleLayout(layoutWidths.phone);
      const attach = canvas.getByRole('button', { name: 'Attach' });
      const agent = canvas.getByRole('button', { name: agentModelLabel });
      const mode = canvas.getByRole('button', { name: 'Mode' });
      const send = canvas.getByRole('button', { name: 'Send' });

      for (const control of [attach, agent, mode, send])
        await expectWithin(control, layoutWidths.phone);

      await expect(overlaps(boxOf(attach), boxOf(agent))).toBe(false);
      await expect(clipsItsWords(agent)).toBe(false);
      await expect(clipsItsWords(mode)).toBe(false);
    } finally {
      restore();
    }
  },
};

// Mode still opens at the largest text sizes: the pill takes the press and its page comes up.
export const ModeOpensAtScaledType: Story = {
  args: composerArgs,
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const restore = scaleControlType(canvasElement);

    try {
      await settleLayout(layoutWidths.phone);
      await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
      await expect(
        await within(document.body).findByRole('heading', { name: 'Mode' }),
      ).toBeVisible();
      await userEvent.keyboard('{Escape}');
    } finally {
      restore();
    }
  },
};
