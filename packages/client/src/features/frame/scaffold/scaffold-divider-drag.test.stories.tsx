import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  acceptInspector,
  acceptSidebar,
  at,
  closeInspectorLabel,
  detailId,
  expandInspectorLabel,
  hiddenAttribute,
  hideSidebarLabel,
  inspectorId,
  moreActionsLabel,
  pointerPress,
  pointerRelease,
  resizeInspectorLabel,
  resizeSidebarLabel,
  sessionListId,
  showSidebarLabel,
  waitForButton,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/DividerDrag',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

type Canvas = ScaffoldPlayContext['canvas'];

async function drag(
  { canvas, userEvent }: ScaffoldPlayContext,
  name: string,
  distance: number,
): Promise<void> {
  const divider = canvas.getByRole('separator', { name });
  const start = divider.getBoundingClientRect();
  await expect(start.height).toBeGreaterThan(100);
  await expect(document.elementFromPoint(start.x + 4, start.y + 100)).toBe(
    divider,
  );
  await userEvent.pointer([
    {
      target: divider,
      coords: at(start, 4),
      keys: pointerPress,
    },
    {
      target: divider,
      coords: at(start, 4 + distance),
    },
    { keys: pointerRelease },
  ]);
}

async function waitForZeroWidth(canvas: Canvas, testId: string): Promise<void> {
  await waitFor(() =>
    expect(canvas.getByTestId(testId).getBoundingClientRect().width).toBe(0),
  );
}

export const DragToCollapseExpandAndReopen: ScaffoldStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas } = context;
    await settleLayout('wide');
    await drag(context, resizeSidebarLabel, -220);
    await acceptSidebar(controlled, false);
    await expect(
      canvas.getByRole('button', { name: showSidebarLabel }),
    ).toBeVisible();
    await waitForZeroWidth(canvas, sessionListId);
    await drag(context, resizeSidebarLabel, 220);
    await acceptSidebar(controlled, true);
    await expect(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    ).toBeVisible();
    await drag(context, resizeInspectorLabel, -240);
    await acceptInspector(controlled, 'open');
    await waitForButton(context, closeInspectorLabel);
    await drag(context, resizeInspectorLabel, -window.innerWidth);
    await acceptInspector(controlled, 'expanded');
    await waitForZeroWidth(canvas, detailId);
    await drag(context, resizeInspectorLabel, window.innerWidth / 2);
    await acceptInspector(controlled, 'open');
    await waitForButton(context, expandInspectorLabel);
    await drag(context, resizeInspectorLabel, window.innerWidth);
    await acceptInspector(controlled, 'closed');
    await expect(
      canvas.getByRole('button', { name: moreActionsLabel }),
    ).toBeVisible();
    await waitForZeroWidth(canvas, inspectorId);
  }),
};

const pageWidth = (canvas: Canvas): number =>
  canvas.getByTestId(detailId).getBoundingClientRect().width;

const listHidden = (canvas: Canvas): string | null =>
  canvas.getByTestId(sessionListId).getAttribute(hiddenAttribute);

// A drag takes the page under the content's floor, keeps the list as it was, and expands the Inspector only past the page's minimum.
export const DragNarrowsThePageUntilTheInspectorExpands: ScaffoldStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas } = context;
    await settleLayout('wide');
    await controlled.render({ inspectorState: 'open' });
    const list = listHidden(canvas);
    const start = pageWidth(canvas);
    await expect(start).toBeGreaterThanOrEqual(688);
    await drag(context, resizeInspectorLabel, 300 - start);
    await waitFor(() => expect(Math.round(pageWidth(canvas))).toBe(300));
    await expect(listHidden(canvas)).toBe(list);
    await expect(controlled.onInspectorStateChange).not.toHaveBeenCalled();
    await drag(context, resizeInspectorLabel, -99);
    await waitFor(() => expect(Math.round(pageWidth(canvas))).toBe(201));
    await drag(context, resizeInspectorLabel, -40);
    await acceptInspector(controlled, 'expanded');
    await waitForZeroWidth(canvas, detailId);
    await expect(listHidden(canvas)).toBe(list);
    await expect(controlled.onInspectorStateChange).toHaveBeenCalledTimes(1);
  }),
};
