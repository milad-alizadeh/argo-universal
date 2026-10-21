import type { Meta } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import { page } from 'vitest/browser';
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

export const TrailingControlsNeverMoveWithPanes: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await page.viewport(1440, 844);
    const group = canvas.getByTestId('window-band-trailing');
    const controls = within(group).getAllByRole('button');
    const positions = controls.map(position);
    await expect(controls).toHaveLength(4);

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

function position(element: HTMLElement): { x: number; y: number } {
  const { x, y } = element.getBoundingClientRect();

  return { x, y };
}
