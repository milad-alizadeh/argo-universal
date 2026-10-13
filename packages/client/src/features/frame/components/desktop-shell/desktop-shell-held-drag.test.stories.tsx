import type { Meta } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  acceptInspector,
  acceptSidebar,
  at,
  closeInspectorLabel,
  hideSidebarLabel,
  moreActionsLabel,
  type Point,
  pointerPress,
  pointerRelease,
  resizeInspectorLabel,
  resizeSidebarLabel,
  restoreInspectorLabel,
  showSidebarLabel,
  waitForButton,
} from './desktop-shell-controls.mocks';
import { DesktopShellFrame } from './desktop-shell-frame.mocks';
import {
  controlledPlay,
  shellMeta,
  type ShellPlayContext,
  type ShellStory,
} from './desktop-shell-test.mocks';

const meta = {
  title: 'Tests/DesktopShell/Held drag',
  ...shellMeta,
} satisfies Meta<typeof DesktopShellFrame>;
export default meta;

type Canvas = ShellPlayContext['canvas'];

async function holdAt(
  { userEvent }: ShellPlayContext,
  target: HTMLElement,
  coords: Point,
): Promise<void> {
  await userEvent.pointer({ target, coords });
}

async function pressAt(
  { userEvent }: ShellPlayContext,
  target: HTMLElement,
  coords: Point,
): Promise<void> {
  await userEvent.pointer({ target, coords, keys: pointerPress });
}

async function expectSameDivider(
  canvas: Canvas,
  name: string,
  divider: HTMLElement,
): Promise<void> {
  await expect(canvas.getByRole('separator', { name })).toBe(divider);
}

export const OneHeldDragCanCloseAndReopenPanels: ShellStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await page.viewport(1440, 844);
    const sidebar = canvas.getByRole('separator', { name: resizeSidebarLabel });
    const start = sidebar.getBoundingClientRect();
    await pressAt(context, sidebar, at(start, 4));
    await holdAt(context, sidebar, at(start, -220));
    await acceptSidebar(controlled, false);
    await expect(
      canvas.getByRole('button', { name: showSidebarLabel }),
    ).toBeVisible();
    await expectSameDivider(canvas, resizeSidebarLabel, sidebar);
    await holdAt(context, sidebar, at(start, 4));
    await acceptSidebar(controlled, true);
    await expect(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    ).toBeVisible();
    await userEvent.pointer({ keys: pointerRelease });
    await controlled.render({ inspectorState: 'open' });
    const inspector = canvas.getByRole('separator', {
      name: resizeInspectorLabel,
    });
    const inspectorStart = inspector.getBoundingClientRect();
    await pressAt(context, inspector, at(inspectorStart, 4));
    await holdAt(context, inspector, at(inspectorStart, -900));
    await acceptInspector(controlled, 'expanded');
    await waitForButton(context, restoreInspectorLabel);
    await expectSameDivider(canvas, resizeInspectorLabel, inspector);
    await holdAt(context, inspector, at(inspectorStart, 800));
    await acceptInspector(controlled, 'closed');
    await expect(
      canvas.getByRole('button', { name: moreActionsLabel }),
    ).toBeVisible();
    await expectSameDivider(canvas, resizeInspectorLabel, inspector);
    await holdAt(context, inspector, at(inspectorStart, -100));
    await acceptInspector(controlled, 'open');
    await waitForButton(context, closeInspectorLabel);
    await userEvent.pointer({ keys: pointerRelease });
  }),
};
