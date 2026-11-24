import { settleLayout } from '@repo/kit/mocks/story-layout';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, within } from 'storybook/test';
import type { WindowBandView } from '#lib/product/window-band';
import { bandControlAppearance } from './band-control-appearance';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const windowBand = 'window-band';

const trailingGroup = 'window-band-trailing';

const leadingCapsule = 'window-band-leading-capsule';

const trailingCapsuleID = 'window-band-trailing-capsule';

const workbenchToggle = 'Toggle Workbench';

const hideSidebar = 'Hide sidebar';

const pageAction = 'Page action';

const backLabel = 'Back';

const labelOf = (button: HTMLElement): string | null =>
  button.getAttribute('aria-label');

// The trailing controls, in the order the band draws them.
const trailingNames = [workbenchToggle, 'Expand Inspector', 'Show Inspector'];

const sessionBand: WindowBandView = {
  session: {
    workbench: <Text>Changes</Text>,
    onInspectorToggle: fn(),
  },
};

type ScaffoldMockProps = React.ComponentProps<typeof ScaffoldMock>;

const pageButton = (
  <IconButton
    {...bandControlAppearance}
    icon="add"
    accessibilityLabel="Page action"
    onPress={fn()}
  />
);

const meta = {
  title: 'Tests/Frame/Scaffold/Band',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

export const SidebarToggleLivesInTheWindowBand: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');
    await controlled.render({});
    const band = canvas.getByTestId(windowBand);
    const toggle = canvas.getByRole('button', { name: hideSidebar });
    const appRegion = 'app-region';
    await expect(band).toContainElement(toggle);
    await expect(getComputedStyle(band).getPropertyValue(appRegion)).toBe(
      'drag',
    );
    await expect(getComputedStyle(toggle).getPropertyValue(appRegion)).toBe(
      'no-drag',
    );
    await expect(canvas.getByTestId('desktop-rail')).not.toContainElement(
      toggle,
    );
  }),
};

// The band carries Back, so a drill-in page's title hangs none of its own.
export const PageTitleDrawsNoBack: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');
    await controlled.render({
      band: null,
      children: (
        <Screen title="Issues" onBack={fn()}>
          <Text>Body</Text>
        </Screen>
      ),
    });

    const page = within(canvas.getByTestId('desktop-detail'));

    await expect(page.getByText('Body')).toBeVisible();
    await expect(page.queryByRole('button', { name: backLabel })).toBeNull();
  }),
};

// With the Inspector closed its controls float in the title bar's trailing capsule, and the sidebar never moves them.
function trailingCapsule(width: number): ScaffoldStory {
  return {
    args: { band: sessionBand },
    play: controlledPlay(async ({ canvas }, controlled) => {
      await settleLayout(width);
      await settleMotion();

      const controls = (): HTMLElement[] =>
        trailingNames.map((name) => canvas.getByRole('button', { name }));

      const positions = controls().map(position);
      const lefts = positions.map(({ x }) => x);
      await expect(lefts).toEqual([...lefts].sort((a, b) => a - b));

      await expect(
        canvas.getByRole('button', { name: 'Expand Inspector' }),
      ).toBeDisabled();

      for (const sidebarShown of [false, true]) {
        await controlled.render({ sidebarShown, inspectorState: 'closed' });
        await settleMotion();
        await expect(controls().map(position)).toEqual(positions);
      }
    }),
  };
}

export const TrailingCapsuleNeverMovesWithTheSidebar = trailingCapsule(1440);

export const TrailingCapsuleAtNarrowWidth = trailingCapsule(1100);

export const TrailingCapsuleAtVeryWideWidth = trailingCapsule(1920);

// Open or expanded, the Inspector's top row holds its controls: the title bar's trailing group spans the row and lets presses through to it.
export const OpenInspectorHoldsItsControls: ScaffoldStory = {
  args: { band: sessionBand },
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await settleLayout(1440);

    for (const inspectorState of ['open', 'expanded'] as const) {
      await controlled.render({ inspectorState });
      await expect(canvas.queryByTestId(trailingCapsuleID)).toBeNull();

      for (const name of [workbenchToggle, 'Hide Inspector'])
        await expectInInspectorRow(canvas, name);
    }

    await controlled.render({ inspectorState: 'open' });
    await userEvent.click(
      canvas.getByRole('button', { name: 'Hide Inspector' }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenCalledWith(
      'closed',
    );
  }),
};

// Closed, the sidebar's toggle, Back and Forward float on the leading capsule; open, they sit in the sidebar's top row.
export const LeadingCapsuleHoldsTheClosedSidebarsControls: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');

    const leading = (): ReturnType<typeof within> =>
      within(canvas.getByTestId('window-band-leading'));

    await controlled.render({ sidebarShown: true });
    await expect(canvas.queryByTestId(leadingCapsule)).toBeNull();
    await controlled.render({ sidebarShown: false });
    await settleMotion();
    const capsule = canvas.getByTestId(leadingCapsule);
    const buttons: HTMLElement[] = leading().getAllByRole('button');

    await expect(buttons.map(labelOf)).toEqual([
      'Show sidebar',
      backLabel,
      'Forward',
    ]);

    for (const button of buttons)
      await expect(inside(button, capsule)).toBe(true);
  }),
};

// The page's own buttons lead the Session's in the title bar's trailing group, on the capsule or in the open Inspector's top row.
export const PageButtonsDrawInTheTrailingGroup: ScaffoldStory = {
  args: { band: { ...sessionBand, actions: pageButton } },
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout(1440);
    const group = within(canvas.getByTestId(trailingGroup));

    await expect(group.getAllByRole('button').map(labelOf)).toEqual([
      pageAction,
      workbenchToggle,
    ]);
    await expect(
      inside(
        group.getByRole('button', { name: pageAction }),
        canvas.getByTestId(trailingCapsuleID),
      ),
    ).toBe(true);

    await controlled.render({ inspectorState: 'open' });
    await expect(canvas.getByTestId(trailingGroup)).toContainElement(
      canvas.getByRole('button', { name: pageAction }),
    );
    await expectInInspectorRow(canvas, pageAction);
  }),
};

/*
 * Each panel's toggle keeps one place and size, open or closed and in every frame between, as the panels' toggles in
 * Mail and Codex do: only the buttons beside it move.
 */
function toggleKeepsItsPlace(
  name: RegExp,
  states: readonly [Partial<ScaffoldMockProps>, Partial<ScaffoldMockProps>],
): ScaffoldStory {
  return {
    args: { band: sessionBand },
    play: controlledPlay(async ({ canvas }, controlled) => {
      await settleLayout(1440);
      await controlled.render(states[0]);
      await settleMotion();
      const resting = box(canvas.getByRole('button', { name }));

      for (const state of [states[1], states[0]]) {
        await controlled.render(state);

        const frames = await boxesWhileMoving(() =>
          canvas.getByRole('button', { name }),
        );

        for (const frame of frames) await expect(frame).toEqual(resting);
      }
    }),
  };
}

export const SidebarToggleKeepsItsPlace = toggleKeepsItsPlace(/sidebar$/, [
  { sidebarShown: true },
  { sidebarShown: false },
]);

export const HistoryButtonsJumpBetweenFixedPositions: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout(1440);

    const history = (): HTMLElement[] =>
      [backLabel, 'Forward'].map((name) =>
        canvas.getByRole('button', { name }),
      );

    await controlled.render({ sidebarShown: true });
    await settleMotion();
    const open = history().map(box);
    const list = canvas.getByTestId('desktop-list').getBoundingClientRect();
    await expect(open[0].x).toBeGreaterThan(list.left);
    const trailingGap = list.right - open[1].x - open[1].width;
    await expect(trailingGap).toBeGreaterThanOrEqual(0);
    await expect(trailingGap).toBeLessThan(open[1].width);

    await controlled.render({ sidebarShown: false });
    await settleMotion();
    const closed = history().map(box);
    const capsule = canvas.getByTestId(leadingCapsule);

    for (const button of history())
      await expect(inside(button, capsule)).toBe(true);

    await expect(closed[1].x).toBeLessThan(open[0].x);

    for (const [sidebarShown, boxes] of [
      [true, open],
      [false, closed],
    ] as const) {
      await controlled.render({ sidebarShown });
      await Promise.all(
        history().map(async (button, index) => {
          for (const frame of await boxesWhileMoving(() => button))
            await expect(frame).toEqual(boxes[index]);
        }),
      );
    }
  }),
};

export const InspectorToggleKeepsItsPlace = toggleKeepsItsPlace(
  /^(Show|Hide) Inspector$/,
  [{ inspectorState: 'closed' }, { inspectorState: 'open' }],
);

// Expand stays beside the Inspector toggle, open or closed: it leaves the open Inspector's row to sit there.
export const ExpandKeepsItsPlace = toggleKeepsItsPlace(
  /^(Expand|Restore) Inspector$/,
  [{ inspectorState: 'closed' }, { inspectorState: 'open' }],
);

// The frame's inset in from the window's right edge, where every pane ends, and the capsule's padding inside it.
const frameInset = 8;

const capsulePadding = 2;

/*
 * The closed Inspector's capsule, the open Inspector's panel and the Workbench's panel all end on the panes' one right
 * edge, whether the Workbench shows or not; the Inspector toggle ends the capsule's padding inside it.
 */
export const TrailingEdgesLineUp: ScaffoldStory = {
  args: { band: sessionBand },
  play: controlledPlay(async ({ canvas }, controlled) => {
    const right = (testID: string): number =>
      canvas.getByTestId(testID).getBoundingClientRect().right;

    const toggle = (): number =>
      canvas
        .getByRole('button', { name: /^(Show|Hide) Inspector$/ })
        .getBoundingClientRect().right;

    // The Workbench shows in the page's gutter at 1920, and has no room for it at 1440.
    for (const [width, workbench] of [
      [1920, true],
      [1440, false],
    ] as const) {
      await settleLayout(width);
      const edge = right(windowBand) - frameInset;
      await controlled.render({ inspectorState: 'closed' });
      await settleMotion();
      await expect(right(trailingCapsuleID)).toBe(edge);
      await expect(toggle()).toBe(edge - capsulePadding);
      await expect(
        canvas.queryByRole('region', { name: 'Workbench overview' }) !== null,
      ).toBe(workbench);

      if (workbench) await expect(right('desktop-workbench')).toBe(edge);

      await controlled.render({ inspectorState: 'open' });
      await settleMotion();
      await expect(right('desktop-inspector')).toBe(edge);
      await expect(toggle()).toBe(edge - capsulePadding);
    }
  }),
};

type Box = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;

function box(element: Element): Box {
  const { x, y, width, height } = element.getBoundingClientRect();

  return { x, y, width, height };
}

function inside(element: Element, container: Element): boolean {
  const inner = element.getBoundingClientRect();
  const outer = container.getBoundingClientRect();

  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.top >= outer.top &&
    inner.bottom <= outer.bottom
  );
}

const nextFrame = (): Promise<number> =>
  new Promise((resolve) => requestAnimationFrame(resolve));

// The Frame's motion runs this long; a few frames over lets it finish.
const motionFrames = 30;

async function boxesWhileMoving(element: () => Element): Promise<Box[]> {
  const boxes: Box[] = [];

  for (let frame = 0; frame < motionFrames; frame += 1) {
    boxes.push(box(element()));
    await nextFrame();
  }

  return boxes;
}

async function settleMotion(): Promise<void> {
  for (let frame = 0; frame < motionFrames; frame += 1) await nextFrame();
}

// The button sits in the open Inspector's top row, the title bar's line above its content.
async function expectInInspectorRow(
  canvas: ScaffoldPlayContext['canvas'],
  name: string,
): Promise<void> {
  await settleMotion();
  const row = canvas.getByTestId('inspector-title-bar').getBoundingClientRect();
  const button = canvas.getByRole('button', { name }).getBoundingClientRect();

  await expect(button.left).toBeGreaterThanOrEqual(row.left);
  await expect(button.right).toBeLessThanOrEqual(row.right);
  const band = canvas.getByTestId(windowBand).getBoundingClientRect();
  await expect(button.top).toBeGreaterThanOrEqual(row.top);
  await expect(button.top + button.height / 2).toBeCloseTo(
    band.top + band.height / 2,
    0,
  );
}

function position(element: HTMLElement): Pick<DOMRect, 'x' | 'y'> {
  const { x, y } = element.getBoundingClientRect();

  return { x, y };
}

// Compact drill-in belongs to the page; desktop navigation and pane controls do not survive on a phone.
export const CompactShowsThePageWithoutDesktopChrome: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('phone');
    await controlled.render({ sizeClass: 'compact' });
    await expect(canvas.getByTestId('compact-frame')).toBeVisible();
    await expect(canvas.getByTestId('detail-content')).toBeVisible();
    await expect(canvas.queryByTestId('desktop-rail')).toBeNull();
    await expect(canvas.queryByTestId('desktop-list')).toBeNull();
    await expect(canvas.queryByTestId(windowBand)).toBeNull();
    await expect(canvas.queryByRole('separator')).toBeNull();
  }),
};

/*
 * A Session that offers neither pane: its panes are a page-without-a-Session's, so a band drawn from it and a band
 * drawn from no claim at all differ in the trailing group alone.
 */
const sessionWithoutPanes: WindowBandView = {
  ...sessionBand,
  session: {},
};

type ScaffoldCanvas = ScaffoldPlayContext['canvas'];

// The window controls keep the same geometry when a page takes over.
interface BandGeometry {
  band: DOMRect;
  sidebarToggle: Pick<DOMRect, 'x' | 'y'>;
}

function bandGeometry(canvas: ScaffoldCanvas): BandGeometry {
  return {
    band: canvas.getByTestId(windowBand).getBoundingClientRect(),
    sidebarToggle: position(canvas.getByRole('button', { name: /sidebar$/ })),
  };
}

/*
 * A page that owns no Session claims nothing, so the band draws no control it has no subject for, and keeps the box
 * and the leading group it has where the controls are drawn.
 */
export const PageWithoutASessionDropsTheTrailingControls: ScaffoldStory = {
  args: { band: sessionWithoutPanes },
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');
    const withSession = bandGeometry(canvas);
    await controlled.render({ band: null });
    await expect(canvas.getByTestId(windowBand)).toBeVisible();
    await expect(canvas.queryByTestId(trailingGroup)).toBeNull();

    for (const name of trailingNames) {
      await expect(canvas.queryByRole('button', { name })).toBeNull();
    }

    await expect(bandGeometry(canvas)).toEqual(withSession);
  }),
};
