import { shownText } from '@repo/kit/mocks/shown-text';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { Composer } from '#features/composer';
import { composerProps } from '../../../../mocks/composer-mock';
import {
  pressInspectorButton,
  resizeInspectorLabel,
} from './scaffold-controls.mocks';
import {
  controlledPlay,
  narrowDesktopWidth,
  preservedDraft,
  scaffoldMeta,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/ComposerWidth',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

const agentIconId = 'composer-agent-icon';

export const ComposerFitsBesideADraggedInspector: ScaffoldStory = {
  args: {
    children: (
      <View
        className="flex-1 justify-end px-4 pb-4"
        testID="responsive-composer"
      >
        <Composer
          {...composerProps({
            sessionStarted: true,
            draft: { text: preservedDraft, attachments: [] },
            onDraftChange: fn(),
            onAttachImages: fn(),
            onSend: fn(),
          })}
        />
      </View>
    ),
  },
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await settleLayout(narrowDesktopWidth);
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Mode' })).toBeVisible(),
    );
    await waitFor(() => expect(canvas.getByTestId(agentIconId)).toBeVisible());
    await controlled.render({ inspectorState: 'open' });
    await expect(canvas.getByTestId(agentIconId)).toBeVisible();
    await expect(canvas.getByTestId('desktop-list')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    canvas.getByRole('separator', { name: resizeInspectorLabel }).focus();
    await userEvent.keyboard('{ArrowLeft}'.repeat(30));

    const content = canvas
      .getByTestId('responsive-composer')
      .getBoundingClientRect();

    // The drag takes the column under its floor, and the Composer narrows with it.
    await expect(content.width).toBeLessThan(300);

    const send = canvas
      .getByRole('button', { name: 'Send' })
      .getBoundingClientRect();

    await expect(send.left).toBeGreaterThanOrEqual(content.left);
    await expect(send.right).toBeLessThanOrEqual(content.right);

    await expect(
      shownText(canvas.getByRole('textbox', { name: 'Message' })),
    ).toBe(preservedDraft);
    await pressInspectorButton(context, controlled, 'closed');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Mode' })).toBeVisible(),
    );
    await waitFor(() => expect(canvas.getByTestId(agentIconId)).toBeVisible());
    await expect(canvas.getByText('session', { exact: true })).toBeVisible();
    await expect(window.innerWidth).toBe(narrowDesktopWidth);
  }),
};
