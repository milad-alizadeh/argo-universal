import { settleLayout } from '@repo/kit/mocks/story-layout';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import type { Meta } from '@storybook/react-native-web-vite';
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

// Every pane state the trailing controls must keep their places through.
const paneStates = [false, true].flatMap((sidebarShown) =>
  (['closed', 'open', 'expanded'] as const).map((inspectorState) => ({
    sidebarShown,
    inspectorState,
  })),
);

// The trailing controls, in the order the band draws them.
const trailingNames = [
  'More',
  'Toggle Workbench',
  'Expand Inspector',
  'Show Inspector',
];

// What a page that owns a Session claims: its header's menu, and the Session the band's pane controls act on.
const sessionBand = (title: string): WindowBandView => ({
  title: (
    <Text accessibilityRole="heading" numberOfLines={1}>
      {title}
    </Text>
  ),
  menu: (
    <IconButton
      {...bandControlAppearance}
      icon="more"
      accessibilityLabel="More"
    />
  ),
  session: {
    workbench: <Text>Changes</Text>,
    onInspectorToggle: fn(),
  },
});

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
    await expect(band).toContainElement(toggle);
    await expect(canvas.getByTestId('desktop-rail')).not.toContainElement(
      toggle,
    );
  }),
};

function trailingControls(width: number): ScaffoldStory {
  return {
    args: { band: sessionBand('Fix login') },
    play: controlledPlay(async ({ canvas }, controlled) => {
      await settleLayout(width);
      const group = canvas.getByTestId(trailingGroup);
      const controls = within(group).getAllByRole('button');
      const positions = controls.map(position);
      await expect(controls).toHaveLength(trailingNames.length);

      for (const [index, name] of trailingNames.entries())
        await expect(controls[index]).toHaveAccessibleName(name);

      for (const panes of paneStates) {
        await controlled.render(panes);
        await expect(
          within(group).getAllByRole('button').map(position),
        ).toEqual(positions);
      }
    }),
  };
}

export const TrailingControlsNeverMoveWithPanes = trailingControls(1440);

export const TrailingControlsAtNarrowWidth = trailingControls(1100);

export const TrailingControlsAtVeryWideWidth = trailingControls(1920);

function position(element: HTMLElement): Pick<DOMRect, 'x' | 'y'> {
  const { x, y } = element.getBoundingClientRect();

  return { x, y };
}

const longTitle =
  'An exceptionally long Session title that needs all available space in the band while every pane control stays reachable. '.repeat(
    8,
  );

export const LongTitleStopsAtTheTrailingControls: ScaffoldStory = {
  args: { band: sessionBand(longTitle) },
  play: controlledPlay(async ({ canvas }) => {
    await settleLayout('wide');
    const title = canvas.getByTestId('band-title');
    const group = canvas.getByTestId(trailingGroup);
    const text = within(title).getByRole('heading');
    await expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(
      group.getBoundingClientRect().left,
    );
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  }),
};

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
  ...sessionBand('Fix login'),
  session: {},
};

// A Session whose own header declares nothing: the band still owes it the whole group.
const sessionWithoutActions: WindowBandView = {
  ...sessionBand('Fix login'),
  menu: undefined,
};

// A page that owns no Session, drawn from its own Screen header alone.
const pageActionsOnly: WindowBandView = {
  ...sessionBand('Settings'),
  session: null,
};

type ScaffoldCanvas = ScaffoldPlayContext['canvas'];

/*
 * What the trailing group must not move: the band's own box, and the leading group beside it. The title's leading
 * edge belongs to the content column (frame-layout.ts reads it from there, never from the trailing group) and
 * animates with it, so the band's before and after on one page is screenshot evidence rather than a measurement.
 */
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

/*
 * The ⋯ belongs to the Session, so a Session that declares no Action of its own still holds the slot and its three
 * pane controls keep their places; only a page that owns no Session loses them.
 */
export const SessionWithoutActionsKeepsEveryControl: ScaffoldStory = {
  args: { band: sessionBand('Fix login') },
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');
    const group = canvas.getByTestId(trailingGroup);
    const positions = within(group).getAllByRole('button').map(position);
    await controlled.render({ band: sessionWithoutActions });
    const after = within(canvas.getByTestId(trailingGroup));
    await expect(after.getAllByRole('button').map(position)).toEqual(positions);
    await expect(after.getByRole('button', { name: 'More' })).toBeDisabled();
  }),
};

// A page that owns no Session but declares Actions of its own keeps those, and gains no control over panes it has none of.
export const PageActionsDrawWithoutTheSessionControls: ScaffoldStory = {
  args: { band: pageActionsOnly },
  play: controlledPlay(async ({ canvas }) => {
    await settleLayout('wide');
    const group = within(canvas.getByTestId(trailingGroup));
    await expect(group.getAllByRole('button')).toHaveLength(1);
    await expect(group.getByRole('button', { name: 'More' })).toBeEnabled();
  }),
};
