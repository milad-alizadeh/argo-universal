import type { Meta } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { Text } from '#primitives/content/text';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = { title: 'Tests/Scaffold/Band', ...scaffoldMeta } satisfies Meta<
  typeof ScaffoldMock
>;

export default meta;

export const SidebarToggleLivesInTheWindowBand: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await page.viewport(1440, 844);
    await controlled.render({});
    const band = canvas.getByTestId('window-band');
    const toggle = canvas.getByRole('button', { name: 'Hide sidebar' });
    await expect(band).toContainElement(toggle);
    await expect(canvas.getByTestId('desktop-rail')).not.toContainElement(
      toggle,
    );
  }),
};

function trailingControls(width: number): ScaffoldStory {
  return {
    play: controlledPlay(async ({ canvas }, controlled) => {
      await page.viewport(width, 844);
      const group = canvas.getByTestId('window-band-trailing');
      const controls = within(group).getAllByRole('button');
      const positions = controls.map(position);
      await expect(controls).toHaveLength(4);
      await expect(controls[0]).toHaveAccessibleName('More');
      await expect(controls[1]).toHaveAccessibleName('Toggle Workbench');
      await expect(controls[2]).toHaveAccessibleName('Expand Stage');
      await expect(controls[3]).toHaveAccessibleName('Show Stage');

      for (const sidebarShown of [false, true]) {
        for (const inspectorState of ['closed', 'open', 'expanded'] as const) {
          await controlled.render({ sidebarShown, inspectorState });
          await expect(
            within(group).getAllByRole('button').map(position),
          ).toEqual(positions);
        }
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
  args: {
    band: {
      title: (
        <Text accessibilityRole="heading" numberOfLines={1}>
          {longTitle}
        </Text>
      ),
    },
  },
  play: controlledPlay(async ({ canvas }) => {
    await page.viewport(1440, 844);
    const title = canvas.getByTestId('band-title');
    const group = canvas.getByTestId('window-band-trailing');
    const text = within(title).getByRole('heading');
    await expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(
      group.getBoundingClientRect().left,
    );
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
  }),
};
