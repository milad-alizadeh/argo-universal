import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Text } from '@repo/kit/primitives/content/text';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type { Meta } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import type { WindowBandView } from '#lib/product/window-band';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
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

// Open or expanded, the Inspector holds its controls in its own top row, which the title bar above it lets presses through to.
export const OpenInspectorHoldsItsControls: ScaffoldStory = {
  args: { band: sessionBand },
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await settleLayout(1440);

    for (const inspectorState of ['open', 'expanded'] as const) {
      await controlled.render({ inspectorState });
      const inspector = within(canvas.getByTestId('desktop-inspector'));
      await expect(canvas.queryByTestId(trailingGroup)).toBeNull();
      await expect(
        inspector.getByRole('button', { name: 'Toggle Workbench' }),
      ).toBeVisible();
      await expect(
        inspector.getByRole('button', { name: 'Hide Inspector' }),
      ).toBeVisible();
    }

    await controlled.render({ inspectorState: 'open' });
    await userEvent.click(
      within(canvas.getByTestId('desktop-inspector')).getByRole('button', {
        name: 'Hide Inspector',
      }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenCalledWith(
      'closed',
    );
  }),
};

// Closed, the sidebar's toggle, Back and Forward gather in the leading capsule; open, they sit in the sidebar's top row.
export const LeadingCapsuleHoldsTheClosedSidebarsControls: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');

    const leading = (): ReturnType<typeof within> =>
      within(canvas.getByTestId('window-band-leading'));

    await controlled.render({ sidebarShown: true });
    await expect(leading().queryByTestId('window-band-capsule')).toBeNull();
    await controlled.render({ sidebarShown: false });
    const capsule = within(leading().getByTestId('window-band-capsule'));

    await expect(
      capsule
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Show sidebar', 'Back', 'Forward']);
  }),
};

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
