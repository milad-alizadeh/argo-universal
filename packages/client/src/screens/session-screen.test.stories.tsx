import { newSessionCatalogs, recordedFeedMocks } from '@repo/api/mocks';
import type { FeedSnapshot, FeedSyncPoint } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { composerImages } from '../../mocks/composer-mock';
import { eachLayout, layoutWidths } from '../../mocks/each-layout';
import { createFeedMocks } from '../../mocks/feed-mock';
import { agentProbeRequests } from '../../mocks/new-session-mock';
import {
  arrivingMessage,
  arrivingRowSessionMocks,
  closureCatalogs,
  emptySessionMocks,
  heldOlderPageSessionMocks,
  idleSessionMocks,
  loadingOlderSessionMocks,
  longSessionMocks,
  oldestMessage,
  runningHeader,
  runningSessionMocks,
  runningTurnNow,
  sendArrivingRow,
  sendOlderPage,
  splitGroupSessionMocks,
  splitGroupStepInTail,
  twoSessionMocks,
  unavailableSessionCases,
} from '../../mocks/session-screen-mock';
import { SessionScreenPreview } from '../../mocks/session-screen-preview';
import {
  SessionSwitchPreview,
  switchSession,
} from '../../mocks/session-switch-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { createSubscriptionPublisher } from '../../mocks/subscription-publisher';
import { type Fixtures, fails } from '../../mocks/trpc-mock-link';
import { SessionScreen } from './session-screen';

const meta = {
  title: 'Tests/SessionScreen',
  component: SessionScreen,
  parameters: { trpc: runningSessionMocks, screenPreview: true },
  args: { id: 'session-1', now: runningTurnNow },
  render: (args) => <SessionScreenPreview {...args} />,
} satisfies Meta<typeof SessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

function unavailableAgentRetry(width: number, agentIndex: number): Story {
  const recorded = unavailableSessionCases[agentIndex];
  const other = newSessionCatalogs.bothAvailable.find(
    (agent) => agent.agent !== recorded?.agent.agent,
  );
  if (!recorded || !other)
    throw new Error(
      'Recorded catalog needs two Agents for started Session recovery',
    );
  return {
    parameters: { trpc: recorded.fixtures },
    beforeEach: () => {
      agentProbeRequests.length = 0;
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Agent and model' }),
      );
      const overlay = within(document.body);
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose Agent' }),
        );
      const current = await overlay.findByRole('button', {
        name: `Select ${recorded.agent.label}`,
      });
      await waitFor(() => expect(current).toBeVisible());
      await expect(current).toBeDisabled();
      await expect(within(current).getByText(recorded.reason)).toBeVisible();
      await expect(
        overlay.queryByRole('button', { name: `Select ${other.label}` }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        overlay.getByRole('button', { name: `Retry ${recorded.agent.label}` }),
      );
      await waitFor(() =>
        expect(
          overlay.queryByText('Unavailable', { exact: true }),
        ).not.toBeInTheDocument(),
      );
      await expect(
        overlay.getByRole('button', { name: `Select ${recorded.agent.label}` }),
      ).toBeDisabled();
      await expect(
        overlay.queryByText(recorded.reason),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('button', { name: `Select ${other.label}` }),
      ).not.toBeInTheDocument();
      await expect(
        agentProbeRequests.filter((input) => input?.refresh),
      ).toEqual([{ refresh: true }]);
    },
  };
}
export const UnavailableAgentRetryPhoneFirstAgent = unavailableAgentRetry(
  layoutWidths.phone,
  0,
);
export const UnavailableAgentRetryPhoneSecondAgent = unavailableAgentRetry(
  layoutWidths.phone,
  1,
);
export const UnavailableAgentRetryWideFirstAgent = unavailableAgentRetry(
  layoutWidths.wide,
  0,
);
export const UnavailableAgentRetryWideSecondAgent = unavailableAgentRetry(
  layoutWidths.wide,
  1,
);

// At a phone's size the Feed overflows a screen, so the reader can scroll away from the end.
async function resizeToPhoneWidth() {
  if ('__vitest_browser__' in globalThis)
    await settleViewport(layoutWidths.phone);
}

// A loaded runner can take a few frames per scroll before the Feed answers.
const scrollAwayWait = { timeout: 15000, interval: 100 };

const scrolledToEnd = (feedScroll: HTMLElement) =>
  feedScroll.scrollHeight - feedScroll.scrollTop - feedScroll.clientHeight < 2;

// Scrolls up as a reader does on the web: the wheel turning up stops the Feed following the end, which setting scrollTop alone does not.
function scrollUp(feedScroll: HTMLElement, distance: number) {
  feedScroll.dispatchEvent(new WheelEvent('wheel', { deltaY: -distance }));
  feedScroll.scrollTop = Math.max(0, feedScroll.scrollTop - distance);
  feedScroll.dispatchEvent(new Event('scroll'));
}

function fullyInViewport(element: Element) {
  const box = element.getBoundingClientRect();
  return (
    box.height > 0 &&
    box.top >= 0 &&
    box.bottom <= window.innerHeight &&
    box.left >= 0 &&
    box.right <= window.innerWidth
  );
}

export const RunningTurn: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      const heading = await canvas.findByRole('heading', {
        name: /^Think briefly first/,
      });
      await expect(heading).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Running')).toBeVisible();
        await expect(canvas.getByText('for 4m 12s')).toBeVisible();
      } else {
        // The native header holds the plain title and two items, no status.
        await expect(
          canvas.getByRole('button', { name: 'Changes' }),
        ).toBeVisible();
        await expect(canvas.queryByText('Running')).toBeNull();
      }
      await expect(canvas.getByRole('button', { name: 'More' })).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
      await expect(canvas.getByRole('status')).toHaveTextContent(
        runningHeader.text,
      );
    }),
};

export const Idle: Story = {
  parameters: { trpc: idleSessionMocks },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        await canvas.findByRole('heading', {
          name: /^Without using any tools/,
        }),
      ).toBeVisible();
      if (wide) {
        await expect(canvas.getByText('Idle')).toBeVisible();
        await expect(canvas.queryByText(/^for /)).toBeNull();
      }
      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
      // The newest row sits at the bottom, above the Composer.
      await waitFor(() =>
        expect(fullyInViewport(canvas.getByText('Redraws'))).toBe(true),
      );
      // Rows keep the screen's side margin, however narrow the Feed.
      const feedScroll = canvas.getByTestId('feed-scroll');
      const feed = feedScroll.getBoundingClientRect();
      const row = within(feedScroll)
        .getByText('Why every Feed row re-renders')
        .getBoundingClientRect();
      await expect(row.left - feed.left).toBeGreaterThanOrEqual(16);
      await expect(feed.right - row.right).toBeGreaterThanOrEqual(16);
    }),
};

export const LoadingEarlier: Story = {
  parameters: { trpc: loadingOlderSessionMocks },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('feed-scroll');
    scrollUp(scroll, scroll.scrollTop);
    await eachLayout(async () => {
      const indicator = await canvas.findByRole('progressbar', {
        name: 'Loading earlier',
      });
      await waitFor(() => expect(fullyInViewport(indicator)).toBe(true));
    });
  },
};

export const PagesOlderRows: Story = {
  parameters: { trpc: longSessionMocks },
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId('feed-scroll');
    const feed = within(scroll);
    await expect(feed.queryAllByText(oldestMessage)).toHaveLength(0);
    // Reads back a screen at a time, as a reader does, until the oldest page has loaded and drawn.
    await waitFor(
      async () => {
        scrollUp(scroll, scroll.clientHeight);
        await expect(feed.queryAllByText(oldestMessage).length).toBeGreaterThan(
          0,
        );
      },
      { timeout: 15000, interval: 100 },
    );
  },
};

// The element at the middle of the Feed's view, and where its top is now.
function markMiddleOfView(feedScroll: HTMLElement) {
  const view = feedScroll.getBoundingClientRect();
  const element = document.elementFromPoint(
    view.left + view.width / 2,
    view.top + view.height / 2,
  );
  if (!element) throw new Error('Nothing in view');
  const top = element.getBoundingClientRect().top;
  return { element, top };
}

// After two frames, the browser has sent its scroll and resize events and the Feed has answered them.
const afterTwoFrames = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

// Once rows in view stop measuring, the middle of the view holds the same element at the same place two frames apart.
function markSettledMiddleOfView(feedScroll: HTMLElement) {
  let lastMark = markMiddleOfView(feedScroll);
  return waitFor(
    async () => {
      await afterTwoFrames();
      const mark = markMiddleOfView(feedScroll);
      const settled =
        mark.element === lastMark.element && mark.top === lastMark.top;
      lastMark = mark;
      if (!settled) throw new Error('Rows in view are still measuring');
      return mark;
    },
    { timeout: 5000 },
  );
}

// Where an element's top settles once it shows at its centre, unclipped, and holds still for two frames.
function settledTopOf(findElement: () => HTMLElement) {
  let lastTop: number | undefined;
  return waitFor(
    async () => {
      await afterTwoFrames();
      const box = findElement().getBoundingClientRect();
      const atCentre = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      const settled = findElement().contains(atCentre) && box.top === lastTop;
      lastTop = box.top;
      if (!settled) throw new Error('The element is still moving');
      return box.top;
    },
    { timeout: 5000 },
  );
}

export const KeepsPlaceWhenOlderRowsLoad: Story = {
  parameters: { trpc: heldOlderPageSessionMocks },
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    // Reads back a screen at a time to the top; the page before is already on its way.
    await waitFor(
      () => {
        scrollUp(scroll, scroll.clientHeight);
        expect(scroll.scrollTop).toBe(0);
      },
      { timeout: 15000, interval: 100 },
    );
    await expect(
      canvas.getByRole('progressbar', { name: 'Loading earlier' }),
    ).toBeVisible();
    // A screen down, past the top group, which an older page can extend.
    scroll.scrollTop = scroll.clientHeight;
    scroll.dispatchEvent(new Event('scroll'));
    const marked = await markSettledMiddleOfView(scroll);
    const heightBefore = scroll.scrollHeight;
    sendOlderPage();
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(heightBefore),
    );
    // Older rows draw above what the reader is reading, which stays where it was once they measure.
    await markSettledMiddleOfView(scroll);
    await expect(
      Math.abs(marked.element.getBoundingClientRect().top - marked.top),
    ).toBeLessThan(2);
  },
};

// The newest page starts partway through a Tool call group, so the older page gives that group its first rows.
export const KeepsPlaceWhenOlderRowsJoinAGroup: Story = {
  parameters: { trpc: splitGroupSessionMocks },
  play: async ({ canvas, userEvent }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await waitFor(
      () => {
        scrollUp(scroll, scroll.clientHeight);
        expect(scroll.scrollTop).toBe(0);
      },
      { timeout: 15000, interval: 100 },
    );
    await expect(
      canvas.getByRole('progressbar', { name: 'Loading earlier' }),
    ).toBeVisible();
    // The reader opens the group and reads one of its commands.
    await userEvent.click(
      canvas.getByRole('button', { name: 'Ran 10 commands' }),
    );
    const step = () =>
      canvas.getByRole('button', { name: splitGroupStepInTail });
    const top = await settledTopOf(step);
    sendOlderPage();
    // The group gains its first ten commands above, stays open, and the command being read stays where it was.
    await expect(
      await canvas.findByRole('button', { name: 'Ran 20 commands' }),
    ).toBeVisible();
    await expect(Math.abs((await settledTopOf(step)) - top)).toBeLessThan(2);
  },
};

export const JumpsToLatest: Story = {
  parameters: { trpc: arrivingRowSessionMocks },
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    const feed = within(scroll);
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
    // The Feed settles at the end as it opens, so the reader scrolls up until it stays up.
    await waitFor(async () => {
      if (scrolledToEnd(scroll)) {
        scrollUp(scroll, scroll.clientHeight);
      }
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    }, scrollAwayWait);
    // A row arriving while the reader is away leaves what they read where it was; rows above may still measure, so compare the screen, not scrollTop.
    const marked = markMiddleOfView(scroll);
    sendArrivingRow();
    const jumpToLatest = await canvas.findByRole('button', {
      name: 'Jump to latest, new rows',
    });
    await expect(
      Math.abs(marked.element.getBoundingClientRect().top - marked.top),
    ).toBeLessThan(2);
    jumpToLatest.click();
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    await expect(await feed.findByText(arrivingMessage)).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
  },
};

export const KeepsPlaceWhenRowOpens: Story = {
  parameters: { trpc: longSessionMocks },
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    const scroll = await canvas.findByTestId('feed-scroll');
    await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
    // Away from the end, opening a row grows the Feed below it and leaves the rows above where they were.
    const closedRowInTopHalf = () => {
      const view = scroll.getBoundingClientRect();
      return within(scroll)
        .queryAllByRole('button', { expanded: false })
        .find((button) => {
          const { top } = button.getBoundingClientRect();
          return top > view.top + 40 && top < view.top + view.height / 2;
        });
    };
    // The reader scrolls up until the Feed stops following the end.
    await waitFor(async () => {
      if (scrolledToEnd(scroll)) {
        scrollUp(scroll, scroll.clientHeight);
      }
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    }, scrollAwayWait);
    // Reads back a third of a screen at a time until a closed row sits in the top half.
    const trigger = await waitFor(
      () => {
        const found = closedRowInTopHalf();
        if (found) return found;
        scrollUp(scroll, scroll.clientHeight / 3);
        throw new Error('No closed row in view');
      },
      { timeout: 5000, interval: 100 },
    );
    const triggerTop = trigger.getBoundingClientRect().top;
    // The trigger's collapsible, which grows as it opens.
    const collapsible = trigger.parentElement;
    if (!collapsible) throw new Error('No collapsible around the row');
    const heightBefore = collapsible.offsetHeight;
    trigger.click();
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
    );
    // Once the row stops growing, the open has finished.
    let lastHeight = heightBefore;
    await waitFor(
      () => {
        const height = collapsible.offsetHeight;
        const stoppedGrowing = height > heightBefore && height === lastHeight;
        lastHeight = height;
        expect(stoppedGrowing).toBe(true);
      },
      { timeout: 5000, interval: 250 },
    );
    // Legend rounds the scroll on each layout pass while the row grows, which leaves it at most a few pixels off.
    await expect(
      Math.abs(trigger.getBoundingClientRect().top - triggerTop),
    ).toBeLessThanOrEqual(3);
    await expect(scrolledToEnd(scroll)).toBe(false);
  },
};

export const SwitchesSessions: Story = {
  parameters: { trpc: twoSessionMocks },
  render: (args) => <SessionSwitchPreview {...args} />,
  play: async ({ canvas }) => {
    await resizeToPhoneWidth();
    await canvas.findByRole('heading', { name: /^Think briefly first/ });
    await expect(canvas.getByRole('button', { name: 'Stop' })).toBeVisible();
    switchSession('session-2');
    // The next Session opens at its own newest row, with none of the last one's rows or state.
    await canvas.findByRole('heading', { name: /^Without using any tools/ });
    await expect(canvas.queryByText(/^Think briefly first/)).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull();
    await expect(canvas.queryByRole('status')).toBeNull();
    await waitFor(() =>
      expect(fullyInViewport(canvas.getByText('Redraws'))).toBe(true),
    );
    await expect(
      canvas.queryByRole('button', { name: /Jump to latest/ }),
    ).toBeNull();
  },
};

export const EmptyFeed: Story = {
  parameters: { trpc: emptySessionMocks },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('heading', { name: 'What should we build?' }),
      ).toBeVisible();
      await expect(canvas.queryByTestId('feed-scroll')).toBeNull();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
    }),
};

const agentFailure = 'The Agent stopped three times in ten minutes';
let openAttempts = 0;
// The Server refuses the first open, as for a Session whose Agent failed, then opens it.
const agentFailedMocks: Fixtures = {
  ...idleSessionMocks,
  'feed.subscribe': (input, signal) => {
    openAttempts += 1;
    if (openAttempts === 1) throw new Error(agentFailure);
    return idleSessionMocks['feed.subscribe']?.(input, signal) as never;
  },
};

export const AgentFailedToOpen: Story = {
  parameters: { trpc: agentFailedMocks },
  beforeEach: () => {
    openAttempts = 0;
  },
  play: async ({ canvas, userEvent }) => {
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent("Couldn't open the Session");
    await expect(alert).toHaveTextContent(agentFailure);
    // Centred on the screen, clear of a phone's header.
    const box = alert.getBoundingClientRect();
    await expect(box.top).toBeGreaterThan(window.innerHeight / 4);
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    await expect(
      await canvas.findByRole('heading', { name: /^Without using any tools/ }),
    ).toBeVisible();
  },
};

function closedFailure(width: number, agentIndex: 0 | 1): Story {
  const catalog = closureCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  const inputs: (FeedSyncPoint | null)[] = [];
  const mocks: Fixtures = {
    ...idleSessionMocks,
    ...catalog.mocks,
    'feed.subscribe': async function* ({ after }) {
      inputs.push(after);
      yield { type: 'snapshot', snapshot: catalog.snapshot };
      if (inputs.length === 1) {
        yield {
          type: 'row.upsert',
          row: catalog.newest,
          rev: catalog.newest.revision,
        };
        yield { type: 'closed', failure: agentFailure };
      }
    },
  };
  return {
    parameters: { trpc: mocks },
    beforeEach: () => {
      inputs.splice(0);
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const alert = await canvas.findByRole('alert');
      await expect(alert).toHaveTextContent("Couldn't open the Session");
      await expect(alert).toHaveTextContent(agentFailure);
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      await userEvent.click(
        within(alert).getByRole('button', { name: 'Retry' }),
      );
      await expect(await canvas.findByText(catalog.newestText)).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(inputs).toHaveLength(2);
      await expect(inputs[1]).toEqual({
        epoch: catalog.snapshot.epoch,
        revision: catalog.newest.revision,
      });
    },
  };
}

export const ClosedFailurePhoneFirstAgent = closedFailure(
  layoutWidths.phone,
  0,
);
export const ClosedFailurePhoneSecondAgent = closedFailure(
  layoutWidths.phone,
  1,
);
export const ClosedFailureWideFirstAgent = closedFailure(layoutWidths.wide, 0);
export const ClosedFailureWideSecondAgent = closedFailure(layoutWidths.wide, 1);

function resumesClosedFeed(width: number, agentIndex: 0 | 1): Story {
  const catalog = closureCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  const inputs: (FeedSyncPoint | null)[] = [];
  let prompts = 0;
  const mocks: Fixtures = {
    ...idleSessionMocks,
    ...catalog.mocks,
    'session.prompt': () => {
      prompts += 1;
      return { messageId: 'next-command' };
    },
    'feed.subscribe': async function* ({ after }) {
      inputs.push(after);
      yield { type: 'snapshot', snapshot: catalog.snapshot };
      yield {
        type: 'row.upsert',
        row: catalog.newest,
        rev: catalog.newest.revision,
      };
      if (inputs.length === 1) yield { type: 'closed', failure: null };
    },
  };
  return {
    parameters: { trpc: mocks },
    beforeEach: () => {
      inputs.splice(0);
      prompts = 0;
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(await canvas.findByText(catalog.newestText)).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(inputs).toHaveLength(1);
      await expect(prompts).toBe(0);
      await userEvent.type(
        canvas.getByRole('textbox', { name: 'Message' }),
        'Continue the Session',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await waitFor(() => expect(prompts).toBe(1));
      await waitFor(() => expect(inputs).toHaveLength(2));
      await expect(inputs[1]).toEqual({
        epoch: catalog.snapshot.epoch,
        revision: catalog.newest.revision,
      });
      await expect(canvas.getByText(catalog.newestText)).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
    },
  };
}

export const ResumesClosedFeedPhoneFirstAgent = resumesClosedFeed(
  layoutWidths.phone,
  0,
);
export const ResumesClosedFeedPhoneSecondAgent = resumesClosedFeed(
  layoutWidths.phone,
  1,
);
export const ResumesClosedFeedWideFirstAgent = resumesClosedFeed(
  layoutWidths.wide,
  0,
);
export const ResumesClosedFeedWideSecondAgent = resumesClosedFeed(
  layoutWidths.wide,
  1,
);

const uploadCatalogs = newSessionCatalogs.bothAvailable.map((agent, index) => {
  const image = composerImages[index];
  const recording = recordedFeedMocks.find(
    (mock) => mock.agent === `agent-${index + 1}`,
  );
  if (!image || !recording)
    throw new Error(
      `Recorded catalog needs an image and a Feed for ${agent.label}.`,
    );
  const snapshot = {
    ...recording.snapshot,
    agent: agent.agent,
    state: 'idle' as const,
    activeTurnId: null,
    liveHeader: null,
    configOptions: agent.configOptions,
  };
  return {
    agent,
    image,
    mocks: createFeedMocks({
      ...recording,
      snapshot,
      stream: [{ type: 'snapshot', snapshot }],
    }),
  };
});

function failedUpload(width: number, agentIndex: 0 | 1): Story {
  const catalog = uploadCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  let calls = 0;
  const failure = 'The Server could not store the image.';
  return {
    beforeEach: () => {
      calls = 0;
    },
    parameters: {
      trpc: {
        ...idleSessionMocks,
        ...catalog.mocks,
        'agents.list': () => [catalog.agent],
        'blob.upload': fails(failure),
        'session.prompt': () => {
          calls += 1;
          return { messageId: 'unexpected-prompt' };
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const message = await canvas.findByRole('textbox', { name: 'Message' });
      await userEvent.type(message, 'Name the dominant color in this image.');
      await userEvent.click(
        canvas.getByRole('button', {
          name: width >= 720 ? 'Attach' : 'Attach images',
        }),
      );
      await userEvent.click(
        await within(document.body).findByRole('button', {
          name: width === layoutWidths.wide ? 'Files and Folder' : 'Photos',
        }),
      );
      const file = new File(
        [await (await fetch(catalog.image.uri)).blob()],
        catalog.image.name,
        { type: 'image/png' },
      );
      await userEvent.upload(
        await within(document.body).findByTestId('file-input'),
        file,
      );
      await expect(
        await canvas.findByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      const alert = await canvas.findByRole('alert');
      await expect(alert.textContent).toBe(
        `Couldn't upload the image. ${failure}`,
      );
      await expect(alert).toBeVisible();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('Name the dominant color in this image.');
      await expect(
        canvas.getByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await expect(calls).toBe(0);
    },
  };
}
export const FailedUploadPhoneFirstAgent = failedUpload(layoutWidths.phone, 0);
export const FailedUploadPhoneSecondAgent = failedUpload(layoutWidths.phone, 1);
export const FailedUploadWideFirstAgent = failedUpload(layoutWidths.wide, 0);
export const FailedUploadWideSecondAgent = failedUpload(layoutWidths.wide, 1);

const heldChoiceCatalogs = newSessionCatalogs.bothAvailable.map(
  (agent, index) => {
    const recording = recordedFeedMocks.find(
      (mock) =>
        mock.agent === `agent-${index + 1}` &&
        mock.recording === 'edit-and-command',
    );
    const model = agent.configOptions.find(
      (option) => option.category === 'model',
    );
    const effort = agent.configOptions.find(
      (option) => option.category === 'thought_level',
    );
    if (!recording || model?.type !== 'select' || effort?.type !== 'select')
      throw new Error(
        'Recorded catalog needs a Feed, model and effort for each Agent.',
      );
    const models = model.options.flatMap((choice) =>
      'groupId' in choice ? choice.options : [choice],
    );
    const efforts = effort.options.flatMap((choice) =>
      'groupId' in choice ? choice.options : [choice],
    );
    const current = models.find(
      (choice) => choice.value === model.currentValue,
    );
    const levels = current?._meta?.argo?.supportedEffortLevels ?? [];
    const narrower = models.find(
      (choice) =>
        choice._meta?.argo?.supportsEffort &&
        levels.some(
          (level) =>
            !choice._meta?.argo?.supportedEffortLevels?.includes(level),
        ),
    );
    const selected = efforts.find(
      (choice) =>
        choice.value !== effort.currentValue &&
        levels.includes(choice.value) &&
        !narrower?._meta?.argo?.supportedEffortLevels?.includes(choice.value),
    );
    if (!selected || !narrower)
      throw new Error(
        'Recorded catalog needs two model effort ranges and an effort outside the narrower range.',
      );
    return { agent, recording, selected, narrower };
  },
);

function heldConfiguration(width: number, agentIndex: number): Story {
  const catalog = heldChoiceCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs two Agents.');
  const { agent, recording, selected, narrower } = catalog;
  const initial = {
    ...recording.snapshot,
    agent: agent.agent,
    configOptions: agent.configOptions,
    state: 'running' as const,
    activeTurnId: 'held-config-turn',
    liveHeader: runningHeader,
  };
  let snapshot = initial;
  const snapshots = createSubscriptionPublisher<FeedSnapshot>();
  const mocks: Fixtures = {
    ...runningSessionMocks,
    ...createFeedMocks(recording),
    'feed.subscribe': async function* (_, signal) {
      yield { type: 'snapshot', snapshot };
      yield* snapshots.subscribe(signal);
    },
    'session.setConfigOption': ({ configId, value }) => {
      const configOptions = snapshot.configOptions.map((option) => {
        if (
          option.configId !== configId ||
          option.type !== 'select' ||
          typeof value !== 'string'
        )
          return option;
        return {
          ...option,
          currentValue: value,
          _meta: {
            ...option._meta,
            argo: { ...option._meta?.argo, heldUntilNextTurn: true },
          },
        };
      });
      snapshot = { ...snapshot, configOptions };
      snapshots.publish({ type: 'snapshot', snapshot });
      return { configOptions };
    },
  };
  return {
    parameters: { trpc: mocks },
    beforeEach: () => {
      snapshot = initial;
      snapshots.reset();
      return () => snapshots.reset();
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Agent and model' }),
      );
      const overlay = within(document.body);
      await waitFor(() =>
        expect(
          overlay.getByText(
            'A Turn is running. Changes apply from the next Turn.',
          ),
        ).toBeVisible(),
      );
      await userEvent.click(
        await overlay.findByRole('button', {
          name: `Set effort to ${selected.name}`,
        }),
      );
      const slider = overlay.getByRole('slider', { name: 'Effort' });
      await waitFor(() =>
        expect(slider).toHaveAttribute('aria-valuetext', selected.name),
      );
      await expect(
        overlay.getByRole('button', { name: `Set effort to ${selected.name}` }),
      ).toHaveAttribute('aria-pressed', 'true');
      if (width === layoutWidths.phone)
        await userEvent.click(
          overlay.getByRole('button', { name: 'Choose model' }),
        );
      await userEvent.click(
        await overlay.findByRole('button', { name: narrower.name }),
      );
      await waitFor(() =>
        expect(overlay.getByRole('slider', { name: 'Effort' })).toHaveAttribute(
          'aria-valuetext',
          'No selection',
        ),
      );
      await expect(
        overlay.queryByRole('button', {
          name: `Set effort to ${selected.name}`,
        }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.getByText(
          'A Turn is running. Changes apply from the next Turn.',
        ),
      ).toBeVisible();
    },
  };
}

export const HeldConfigurationPhoneAgentOne = heldConfiguration(
  layoutWidths.phone,
  0,
);
export const HeldConfigurationWideAgentOne = heldConfiguration(
  layoutWidths.wide,
  0,
);
export const HeldConfigurationPhoneAgentTwo = heldConfiguration(
  layoutWidths.phone,
  1,
);
export const HeldConfigurationWideAgentTwo = heldConfiguration(
  layoutWidths.wide,
  1,
);
function failedPick(width: number, agentIndex: 0 | 1): Story {
  const catalog = uploadCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  let calls = 0;
  let restorePicker = () => {};
  return {
    beforeEach: () => {
      restorePicker();
      calls = 0;
      return () => restorePicker();
    },
    parameters: {
      trpc: {
        ...idleSessionMocks,
        ...catalog.mocks,
        'agents.list': () => [catalog.agent],
        'session.prompt': () => {
          calls += 1;
          return { messageId: 'unexpected-prompt' };
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const bytes = await (await fetch(catalog.image.uri)).blob();
      const attachImage = async (name: string) => {
        await userEvent.click(
          canvas.getByRole('button', {
            name: width >= 720 ? 'Attach' : 'Attach images',
          }),
        );
        const menuName =
          width === layoutWidths.wide ? 'Files and Folder' : 'Photos';
        const menu = await within(document.body).findByRole('button', {
          name: menuName,
        });
        await waitFor(() => expect(menu).toBeVisible());
        await userEvent.click(menu);
        await userEvent.upload(
          await within(document.body).findByTestId('file-input'),
          new File([bytes], name, { type: 'image/png' }),
        );
        await waitFor(() =>
          expect(
            within(document.body).queryByRole('button', { name: menuName }),
          ).toBeNull(),
        );
      };
      await userEvent.type(
        await canvas.findByRole('textbox', { name: 'Message' }),
        'Keep this draft while choosing images.',
      );
      await attachImage(catalog.image.name);
      await expect(
        await canvas.findByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      const picker = spyOn(URL, 'createObjectURL').mockImplementationOnce(
        () => {
          throw new Error('Image selection failed');
        },
      );
      restorePicker = () => picker.mockRestore();
      try {
        await attachImage('failed-selection.png');
        const alert = await canvas.findByRole('alert');
        await expect(alert.textContent).toBe(
          "Couldn't select images. Try again.",
        );
        await expect(alert).toBeVisible();
        await expect(
          canvas.getByRole('textbox', { name: 'Message' }),
        ).toHaveValue('Keep this draft while choosing images.');
        await expect(
          canvas.getByRole('img', { name: catalog.image.name }),
        ).toBeVisible();
        await expect(
          canvas.queryByRole('img', { name: 'failed-selection.png' }),
        ).toBeNull();
        await expect(
          canvas.getAllByRole('button', { name: /^Remove / }),
        ).toHaveLength(1);
        await expect(
          canvas.queryByRole('button', { name: 'Retry' }),
        ).toBeNull();
        await expect(calls).toBe(0);
        await expect(picker).toHaveBeenCalledOnce();
      } finally {
        picker.mockRestore();
      }
      await attachImage('retry-selection.png');
      await expect(
        await canvas.findByRole('img', { name: 'retry-selection.png' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(
        canvas.getByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('img', { name: 'failed-selection.png' }),
      ).toBeNull();
      await expect(
        canvas.getAllByRole('button', { name: /^Remove / }),
      ).toHaveLength(2);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('Keep this draft while choosing images.');
      await expect(calls).toBe(0);
    },
  };
}
export const FailedPickPhoneFirstAgent = failedPick(layoutWidths.phone, 0);
export const FailedPickPhoneSecondAgent = failedPick(layoutWidths.phone, 1);
export const FailedPickWideFirstAgent = failedPick(layoutWidths.wide, 0);
export const FailedPickWideSecondAgent = failedPick(layoutWidths.wide, 1);
