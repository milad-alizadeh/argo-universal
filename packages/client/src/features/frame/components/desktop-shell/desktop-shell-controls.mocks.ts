import { expect, waitFor } from 'storybook/test';
import type {
  ControlledShell,
  InspectorState,
  ShellPlayContext,
} from './desktop-shell-test.mocks';

export const railId = 'desktop-rail';

export const currentAttribute = 'aria-current';

export const hideSidebarLabel = 'Hide sidebar';

export const resizeInspectorLabel = 'Resize Inspector';

export const showSidebarLabel = 'Show sidebar';

export const closeInspectorLabel = 'Close Inspector';

export const sessionListId = 'desktop-list';

export const listContentId = 'list-content';

export const detailContentId = 'detail-content';

export const hiddenAttribute = 'aria-hidden';

export const moreActionsLabel = 'More actions';

export const inspectorId = 'desktop-inspector';

export const inspectorContentId = 'inspector-content';

export const expandInspectorLabel = 'Expand Inspector';

export const detailId = 'desktop-detail';

export const restoreInspectorLabel = 'Restore Inspector';

export const resizeSidebarLabel = 'Resize sidebar';

export const pointerPress = '[MouseLeft>]';

export const pointerRelease = '[/MouseLeft]';

export interface Point {
  clientX: number;
  clientY: number;
}

export const at = (start: DOMRect, offset: number): Point => ({
  clientX: start.x + offset,
  clientY: start.y + 100,
});

export async function waitForButton(
  { canvas }: ShellPlayContext,
  name: string,
): Promise<void> {
  await waitFor(() =>
    expect(canvas.getByRole('button', { name })).toBeVisible(),
  );
}

export function sidebarToggleLabel(shown: boolean): string {
  return shown ? showSidebarLabel : hideSidebarLabel;
}

export async function acceptSidebar(
  controlled: ControlledShell,
  shown: boolean,
): Promise<void> {
  await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(shown);
  await controlled.render({ sidebarShown: shown });
}

export async function acceptInspector(
  controlled: ControlledShell,
  state: InspectorState,
): Promise<void> {
  await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
    state,
  );
  await controlled.render({ inspectorState: state });
}

export async function toggleSidebar(
  { canvas, userEvent }: ShellPlayContext,
  controlled: ControlledShell,
  shown: boolean,
): Promise<void> {
  await userEvent.click(
    canvas.getByRole('button', { name: sidebarToggleLabel(shown) }),
  );
  await acceptSidebar(controlled, shown);
}

export const inspectorButtonLabels = {
  expanded: expandInspectorLabel,
  open: restoreInspectorLabel,
  closed: closeInspectorLabel,
} as const satisfies Record<InspectorState, string>;

export async function pressInspectorButton(
  { canvas, userEvent }: ShellPlayContext,
  controlled: ControlledShell,
  state: InspectorState,
): Promise<void> {
  await userEvent.click(
    canvas.getByRole('button', { name: inspectorButtonLabels[state] }),
  );
  await acceptInspector(controlled, state);
}
