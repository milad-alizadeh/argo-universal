import type { Meta } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor } from 'storybook/test';
import { Composer } from '#features/composer';
import { composerProps } from '../../../../../mocks/composer-mock';
import { shownText } from '../../../../../mocks/rich-textarea-example';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { pressInspectorButton } from './desktop-shell-controls.mocks';
import { DesktopShellFrame } from './desktop-shell-frame.mocks';
import {
  controlledPlay,
  narrowDesktopWidth,
  preservedDraft,
  shellMeta,
  type ShellStory,
} from './desktop-shell-test.mocks';

const meta = {
  title: 'Tests/DesktopShell/Composer width',
  ...shellMeta,
} satisfies Meta<typeof DesktopShellFrame>;
export default meta;

const agentIconId = 'composer-agent-icon';

export const ComposerUsesAvailableWidth: ShellStory = {
  args: {
    children: (
      <View
        className="flex-1 justify-end px-4 pb-4"
        testID="responsive-composer"
      >
        <Composer
          {...composerProps({
            sessionStarted: true,
            draft: { text: preservedDraft, images: [] },
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
