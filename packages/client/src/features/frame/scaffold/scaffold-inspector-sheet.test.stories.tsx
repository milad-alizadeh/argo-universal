import type { Meta } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { useSheet } from '#primitives/overlays/sheet';
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

const inspectorSheet = { name: 'Inspector' };

// A part of the Inspector, such as Changes' Compare Against, pushing its own page.
function PushesAPage(): React.JSX.Element {
  const sheet = useSheet();

  return (
    <Button
      label="Show branches"
      onPress={() =>
        sheet.push({
          name: 'branches',
          title: 'Branches',
          children: <Text>Branches page</Text>,
        })
      }
    />
  );
}

// The Inspector sheet's root page takes a pushed page over it, and Back returns to the Inspector.
export const InspectorSheetPushesAPage: ScaffoldStory = {
  play: controlledPlay(async ({ userEvent }, controlled) => {
    await settleViewport(layoutWidths.tablet);
    await controlled.render({
      sizeClass: 'medium',
      inspectorState: 'open',
      inspector: <PushesAPage />,
    });
    const sheet = await screen.findByRole('dialog', inspectorSheet);
    await userEvent.click(
      await within(sheet).findByRole('button', { name: 'Show branches' }),
    );
    await expect(
      await within(sheet).findByRole('heading', { name: 'Branches' }),
    ).toBeVisible();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(
        within(sheet).getByRole('button', { name: 'Show branches' }),
      ).toBeVisible(),
    );
  }),
};
