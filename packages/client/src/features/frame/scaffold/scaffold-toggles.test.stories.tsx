import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  acceptInspector,
  closeInspectorLabel,
  detailContentId,
  inspectorButtonLabels,
  sidebarToggleLabel,
  toggleSidebar,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  scaffoldMeta,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/Toggles',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

export const TogglesPreserveContent: ScaffoldStory = {
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await settleLayout('wide');
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

export const ReversingAToggleRestoresTheSidebar: ScaffoldStory = {
  play: controlledPlay(async (context, controlled) => {
    await settleLayout('wide');
    await toggleSidebar(context, controlled, false);
    await toggleSidebar(context, controlled, true);
    await waitFor(() =>
      expect(context.canvas.getByTestId('desktop-list-content')).toBeVisible(),
    );
  }),
};

export const ContentUpdatesDuringPanelToggle: ScaffoldStory = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await settleLayout('wide');
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
