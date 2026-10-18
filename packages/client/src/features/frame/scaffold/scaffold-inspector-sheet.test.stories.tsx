import type { Meta } from '@storybook/react-native-web-vite';
import { expect, screen, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import {
  acceptInspector,
  closeInspectorLabel,
  detailContentId,
  expandInspectorLabel,
  inspectorContentId,
  inspectorId,
  resizeSidebarLabel,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Scaffold/Inspector sheet',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

// A medium window takes the phone shell, so its Inspector is a sheet over the window: no column beside the page, no sidebar to resize, no expand, and its close button closes the sheet.
export const InspectorIsASheetOnMedium: ScaffoldStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await settleViewport(layoutWidths.tablet);
    await controlled.render({ sizeClass: 'medium', inspectorState: 'open' });
    const sheet = await screen.findByRole('dialog', { name: 'Inspector' });
    await waitFor(() =>
      expect(within(sheet).getByTestId(inspectorContentId)).toBeVisible(),
    );
    await expect(canvas.queryByTestId(inspectorId)).toBeNull();
    await expect(canvas.getByTestId(detailContentId)).toBeVisible();
    await expect(
      canvas.queryByRole('separator', { name: resizeSidebarLabel }),
    ).toBeNull();
    await expect(
      within(sheet).queryByRole('button', { name: expandInspectorLabel }),
    ).toBeNull();
    await userEvent.click(
      within(sheet).getByRole('button', { name: closeInspectorLabel }),
    );
    await acceptInspector(controlled, 'closed');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Inspector' })).toBeNull(),
    );
  }),
};
