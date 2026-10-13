import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  acceptInspector,
  closeInspectorLabel,
  detailContentId,
  inspectorButtonLabels,
  sidebarToggleLabel,
  toggleSidebar,
} from './desktop-shell-controls.mocks';
import { DesktopShellFrame } from './desktop-shell-frame.mocks';
import {
  controlledPlay,
  shellMeta,
  type ShellStory,
} from './desktop-shell-test.mocks';

const meta = {
  title: 'Tests/DesktopShell/Toggles',
  ...shellMeta,
} satisfies Meta<typeof DesktopShellFrame>;
export default meta;

export const TogglesPreserveContent: ShellStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await page.viewport(1440, 844);
    const content = canvas.getByTestId(detailContentId);
    for (const shown of [false, true]) {
      await toggleSidebar(context, controlled, shown);
      await expect(
        canvas.getByRole('button', { name: sidebarToggleLabel(!shown) }),
      ).toBeVisible();
      await expect(canvas.getByTestId(detailContentId)).toBe(content);
    }
    await controlled.render({ inspectorState: 'open' });
    for (const state of ['expanded', 'open', 'closed'] as const) {
      await userEvent.click(
        await canvas.findByRole('button', {
          name: inspectorButtonLabels[state],
        }),
      );
      await acceptInspector(controlled, state);
      await expect(canvas.getByTestId(detailContentId)).toBe(content);
    }
    await expect(content).toBeVisible();
  }),
};

export const ReversingAToggleRestoresTheSidebar: ShellStory = {
  play: controlledPlay(async (context, controlled) => {
    await page.viewport(1440, 844);
    await toggleSidebar(context, controlled, false);
    await toggleSidebar(context, controlled, true);
    await waitFor(() =>
      expect(context.canvas.getByTestId('desktop-list-content')).toBeVisible(),
    );
  }),
};

export const ContentUpdatesDuringPanelToggle: ShellStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await page.viewport(1440, 844);
    await controlled.render({ inspectorState: 'open' });
    await controlled.render({ attentionCount: 2 });
    await expect(
      canvas.getByLabelText('2 Sessions need attention'),
    ).toBeVisible();
    await expect(canvas.getByTestId(detailContentId)).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: closeInspectorLabel }),
    ).toBeVisible();
  }),
};
