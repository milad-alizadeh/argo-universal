import type { Meta } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { Composer } from '#features/composer';
import { composerProps } from '../../../../mocks/composer-mock';
import { shownText } from '../../../../mocks/shown-text';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { pressInspectorButton } from './scaffold-controls.mocks';
import {
  controlledPlay,
  narrowDesktopWidth,
  preservedDraft,
  scaffoldMeta,
  type ScaffoldStory,
} from './scaffold-test.mocks';
import { ScaffoldMock } from './scaffold.mocks';

const meta = {
  title: 'Tests/Scaffold/Composer width',
  ...scaffoldMeta,
} satisfies Meta<typeof ScaffoldMock>;

export default meta;

const agentIconId = 'composer-agent-icon';

export const ComposerUsesAvailableWidth: ScaffoldStory = {
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
    const { canvas } = context;
    await settleViewport(narrowDesktopWidth);
    const mode = await canvas.findByRole('button', { name: 'Mode' });
    await waitFor(() => expect(mode).toBeVisible());
    await waitFor(() => expect(canvas.getByTestId(agentIconId)).toBeVisible());
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(canvas.queryByTestId(agentIconId)).not.toBeInTheDocument(),
    );
    await expect(canvas.queryByTestId(agentIconId)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        canvas.queryByText('session', { exact: true }),
      ).not.toBeInTheDocument(),
    );

    const content = canvas
      .getByTestId('responsive-composer')
      .getBoundingClientRect();

    for (const name of ['Mode', 'Usage', 'Context window', 'Send']) {
      const control = canvas
        .getByRole('button', { name })
        .getBoundingClientRect();

      await expect(control.left).toBeGreaterThanOrEqual(content.left);
      await expect(control.right).toBeLessThanOrEqual(content.right);
    }

    await expect(
      shownText(canvas.getByRole('textbox', { name: 'Message' })),
    ).toBe(preservedDraft);
    await pressInspectorButton(context, controlled, 'closed');
    await waitFor(() => expect(mode).toBeVisible());
    await waitFor(() => expect(canvas.getByTestId(agentIconId)).toBeVisible());
    await expect(canvas.getByText('session', { exact: true })).toBeVisible();
    await expect(window.innerWidth).toBe(narrowDesktopWidth);
  }),
};
