import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  expandInspectorLabel,
  inspectorId,
  pointerPress,
  pointerRelease,
  pressInspectorButton,
  resizeInspectorLabel,
  resizeSidebarLabel,
  restoreInspectorLabel,
  sessionListId,
  toggleSidebar,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Scaffold/Divider resize',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

async function waitForWidth(
  { canvas }: ScaffoldPlayContext,
  testId: string,
  width: number,
): Promise<void> {
  await waitFor(() =>
    expect(canvas.getByTestId(testId).getBoundingClientRect().width).toBe(
      width,
    ),
  );
}

async function widenSidebarByDragging({
  canvas,
  userEvent,
}: ScaffoldPlayContext): Promise<void> {
  const divider = canvas.getByRole('separator', { name: resizeSidebarLabel });
  const start = divider.getBoundingClientRect();
  await userEvent.pointer([
    {
      target: divider,
      coords: { clientX: start.x, clientY: start.y + 100 },
      keys: pointerPress,
    },
    {
      target: divider,
      coords: { clientX: start.x + 60, clientY: start.y + 100 },
    },
    { target: divider, keys: pointerRelease },
  ]);
}

export const DividersResizeAndRememberWidths: ScaffoldStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await page.viewport(1440, 844);
    const list = canvas.getByTestId(sessionListId);
    const listWidth = list.getBoundingClientRect().width;
    await widenSidebarByDragging(context);
    await expect(list.getBoundingClientRect().width).toBeGreaterThan(
      listWidth + 50,
    );
    const resizedListWidth = list.getBoundingClientRect().width;
    await toggleSidebar(context, controlled, false);
    await toggleSidebar(context, controlled, true);
    await waitForWidth(context, sessionListId, resizedListWidth);
    await controlled.render({ inspectorState: 'open' });
    const inspector = canvas.getByTestId(inspectorId);
    const inspectorWidth = inspector.getBoundingClientRect().width;
    canvas.getByRole('separator', { name: resizeInspectorLabel }).focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(inspector.getBoundingClientRect().width).toBeGreaterThan(
      inspectorWidth,
    );
    const resizedInspectorWidth = inspector.getBoundingClientRect().width;
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: expandInspectorLabel }),
      ).toBeVisible(),
    );
    await pressInspectorButton(context, controlled, 'expanded');
    await pressInspectorButton(context, controlled, 'open');
    await waitForWidth(context, inspectorId, resizedInspectorWidth);
    await pressInspectorButton(context, controlled, 'closed');
    await controlled.render({ inspectorState: 'open' });
    await waitForWidth(context, inspectorId, resizedInspectorWidth);
  }),
};

export const ExpandedInspectorKeepsBothDividerEdgesUsable: ScaffoldStory = {
  args: { inspectorState: 'expanded' },
  play: controlledPlay(async ({ canvas, userEvent }) => {
    await page.viewport(1920, 844);

    const listWidth = (): number =>
      canvas.getByTestId(sessionListId).getBoundingClientRect().width;

    await waitFor(() => expect(listWidth()).toBeGreaterThan(0));
    const sidebar = canvas.getByRole('separator', { name: resizeSidebarLabel });

    const inspector = canvas.getByRole('separator', {
      name: resizeInspectorLabel,
    });

    const start = sidebar.getBoundingClientRect();
    const inspectorStart = inspector.getBoundingClientRect();
    await expect(document.elementFromPoint(start.x + 4, start.y + 100)).toBe(
      sidebar,
    );
    await expect(
      document.elementFromPoint(inspectorStart.x + 4, inspectorStart.y + 100),
    ).toBe(inspector);
    const widthBefore = listWidth();
    await userEvent.pointer([
      {
        target: sidebar,
        coords: { clientX: start.x + 4, clientY: start.y + 100 },
        keys: pointerPress,
      },
      {
        target: sidebar,
        coords: { clientX: start.x + 64, clientY: start.y + 100 },
      },
      { keys: pointerRelease },
    ]);
    await expect(listWidth()).toBeGreaterThan(widthBefore);
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: restoreInspectorLabel }),
      ).toBeVisible(),
    );
  }),
};
