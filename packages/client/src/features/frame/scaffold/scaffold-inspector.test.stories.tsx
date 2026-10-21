import { layoutWidths, wideBreakpoint } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta } from '@storybook/react-native-web-vite';
import { expect, screen, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { fadedEdges } from '../../../../mocks/scroll-fade';
import { InspectorFilesMock } from './inspector-files.mocks';
import {
  detailContentId,
  detailId,
  expandInspectorLabel,
  hiddenAttribute,
  inspectorContentId,
  inspectorId,
  listContentId,
  moreActionsLabel,
  pressInspectorButton,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldPlayContext,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const roomyDesktop = 1920;

const meta = {
  title: 'Tests/Scaffold/Inspector',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

async function expectHidden(
  { canvas }: ScaffoldPlayContext,
  testId: string,
): Promise<void> {
  await expect(canvas.getByTestId(testId)).toHaveAttribute(
    hiddenAttribute,
    'true',
  );
}

function inspectorTakesTheDetailAreaAndRestoresIt(
  width: () => number,
): ScaffoldStory {
  return {
    play: controlledPlay(async (context, controlled) => {
      const { canvas } = context;
      await settleViewport(roomyDesktop);
      const pageAction = canvas.getByRole('button', { name: moreActionsLabel });
      await controlled.render({ inspectorState: 'open' });
      await expect(canvas.getByRole('button', { name: moreActionsLabel })).toBe(
        pageAction,
      );
      await expect(
        canvas.getByRole('button', { name: moreActionsLabel }),
      ).toBeVisible();
      await waitFor(() =>
        expect(canvas.getByTestId(inspectorId)).toHaveAttribute(
          hiddenAttribute,
          'false',
        ),
      );
      await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await waitFor(() =>
        expect(
          canvas.getByRole('button', { name: expandInspectorLabel }),
        ).toBeVisible(),
      );
      await pressInspectorButton(context, controlled, 'expanded');
      await expectHidden(context, detailId);
      await expect(canvas.getByTestId(listContentId)).toBeVisible();
      await pressInspectorButton(context, controlled, 'open');
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await settleViewport(width());
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: expandInspectorLabel }),
      ).toBeEnabled();
      await pressInspectorButton(context, controlled, 'closed');
      await expectHidden(context, inspectorId);
      await controlled.render({ inspectorState: 'open' });
      await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
      await settleViewport(roomyDesktop);
      await waitFor(() =>
        expect(canvas.getByTestId(detailContentId)).toBeVisible(),
      );
      await pressInspectorButton(context, controlled, 'closed');
      await expectHidden(context, inspectorId);
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
    }),
  };
}

// The narrowest wide window.
export const InspectorTakesTheDetailAreaAndRestoresItTablet =
  inspectorTakesTheDetailAreaAndRestoresIt(wideBreakpoint);

// Below wide the page owns its Sheet; no desktop Stage or band is drawn by the Scaffold.
export const CompactLeavesInspectorToThePageSheet: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleViewport(layoutWidths.phone);
    await controlled.render({ sizeClass: 'compact', inspectorState: 'open' });
    await expect(canvas.getByTestId(detailContentId)).toBeVisible();
    await expect(canvas.queryByTestId(inspectorId)).toBeNull();
    await expect(canvas.queryByTestId('window-band')).toBeNull();
    await settleViewport(roomyDesktop);
    await controlled.render({ sizeClass: 'wide' });
    await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: expandInspectorLabel }),
    ).toBeVisible();
  }),
};

export const HeaderMenuDoesNotOpenInspector: ScaffoldStory = {
  play: controlledPlay(async (context) => {
    const { canvas, userEvent } = context;
    await userEvent.click(
      canvas.getByRole('button', { name: moreActionsLabel }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: 'Example action' }),
      ).toBeVisible(),
    );
    await expectHidden(context, inspectorId);
    await userEvent.keyboard('{Escape}');
  }),
};

// The Inspector scrolls as a whole and fades under its toolbar into the panel behind it.
export const InspectorScrollKeepsHeaderReachable: ScaffoldStory = {
  args: {
    inspectorState: 'open',
    inspector: <InspectorFilesMock />,
  },
  play: controlledPlay(async ({ canvas }) => {
    await page.viewport(1440, 844);
    const inspector = await canvas.findByTestId('desktop-inspector-scroll');
    await waitFor(() =>
      expect(inspector.scrollHeight).toBeGreaterThan(inspector.clientHeight),
    );
    inspector.scrollTop = 60;
    await waitFor(() => expect(fadedEdges(inspector).top).toBe(true));
    // The fade lies in the scroll view, under the header, so the header stays whole.
    const title = canvas.getByRole('heading', { name: 'Inspector' });
    await expect(inspector.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      title.getBoundingClientRect().bottom - 1,
    );
  }),
};
