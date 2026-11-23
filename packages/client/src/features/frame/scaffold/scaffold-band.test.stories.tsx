import { settleLayout } from '@repo/kit/mocks/story-layout';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, within } from 'storybook/test';
import type { WindowBandView } from '#lib/product/window-band';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { bandControlAppearance } from './band-control-appearance';
import { ScaffoldMock } from './scaffold.mocks';

const windowBand = 'window-band';

const trailingGroup = 'window-band-trailing';

// The trailing controls, in the order the band draws them.
const trailingNames = [
  'Toggle Workbench',
  'Expand Inspector',
  'Show Inspector',
];

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
    const toggle = canvas.getByRole('button', { name: 'Hide sidebar' });
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

export const BackAndForwardFollowTheSidebarToggle: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');
    await controlled.render({});

    const band = within(canvas.getByTestId(windowBand));

    const leading = band
      .getAllByRole('button')
      .slice(0, 3)
      .map((button) => button.getAttribute('aria-label'));

    await expect(leading).toEqual(['Hide sidebar', 'Back', 'Forward']);
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
    await expect(page.queryByRole('button', { name: 'Back' })).toBeNull();
  }),
};

// With the Inspector closed its controls float in the title bar's trailing capsule, and the sidebar never moves them.
function trailingCapsule(width: number): ScaffoldStory {
  return {
    args: { band: sessionBand },
    play: controlledPlay(async ({ canvas }, controlled) => {
      await settleLayout(width);
      const group = canvas.getByTestId(trailingGroup);
      const controls = within(group).getAllByRole('button');
      const positions = controls.map(position);
      await expect(controls).toHaveLength(trailingNames.length);

      for (const [index, name] of trailingNames.entries())
        await expect(controls[index]).toHaveAccessibleName(name);

      await expect(
        within(group).getByRole('button', { name: 'Expand Inspector' }),
      ).toBeDisabled();

      for (const sidebarShown of [false, true]) {
        await controlled.render({ sidebarShown, inspectorState: 'closed' });
        await expect(
          within(group).getAllByRole('button').map(position),
        ).toEqual(positions);
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
      await expect(canvas.queryByTestId('window-band-capsule')).toBeNull();

      for (const name of ['Toggle Workbench', 'Hide Inspector'])
        await expectInInspectorRow(canvas, name);
    }

    await controlled.render({ inspectorState: 'open' });
    await userEvent.click(canvas.getByRole('button', { name: 'Hide Inspector' }));
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
    await expect(leading().queryByTestId('window-band-capsule')).toBeNull();
    await controlled.render({ sidebarShown: false });
    await settleMotion();
    const capsule = leading().getByTestId('window-band-capsule');
    const buttons: HTMLElement[] = leading().getAllByRole('button');

    await expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      ['Show sidebar', 'Back', 'Forward'],
    );

    for (const button of buttons) await expect(inside(button, capsule)).toBe(true);
  }),
};

// The page's own buttons lead the Session's in the title bar's trailing group, on the capsule or in the open Inspector's top row.
export const PageButtonsDrawInTheTrailingGroup: ScaffoldStory = {
  args: { band: { ...sessionBand, actions: pageButton } },
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout(1440);
    const group = within(canvas.getByTestId(trailingGroup));

    await expect(
      group.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Page action', ...trailingNames]);
    await expect(
      inside(
        group.getByRole('button', { name: 'Page action' }),
        canvas.getByTestId('window-band-capsule'),
      ),
    ).toBe(true);

    await controlled.render({ inspectorState: 'open' });
    await expect(canvas.getByTestId(trailingGroup)).toContainElement(
      canvas.getByRole('button', { name: 'Page action' }),
    );
    await expectInInspectorRow(canvas, 'Page action');
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
      await expect(resting).toMatchObject({ width: 32, height: 32 });

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

export const InspectorToggleKeepsItsPlace = toggleKeepsItsPlace(
  /^(Show|Hide) Inspector$/,
  [{ inspectorState: 'closed' }, { inspectorState: 'open' }],
);

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
  await expect(button.top + button.height / 2).toBeCloseTo(
    row.top + row.height / 2,
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
