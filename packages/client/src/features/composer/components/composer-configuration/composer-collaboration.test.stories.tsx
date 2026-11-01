import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import {
  ComposerAgentModelControl,
  ComposerModeControl,
} from './composer-configuration';
import { configuration } from './picker-story-fixtures';

const onConfigChange = fn();

const configured = {
  ...configuration,
  onConfigChange,
  configOptions: [
    ...recordedSessionOptions(configuration.agent?.id ?? ''),
    {
      configId: 'collaboration_mode',
      category: 'collaboration_mode',
      name: 'Collaboration mode',
      type: 'select' as const,
      currentValue: 'default',
      options: [
        { value: 'default', name: 'Default' },
        { value: 'plan', name: 'Plan' },
      ],
    },
    {
      configId: 'fast-mode',
      category: 'model_config',
      name: 'Fast mode',
      type: 'boolean' as const,
      currentValue: true,
    },
  ],
};

const meta = {
  title: 'Tests/Composer/ComposerConfiguration/Collaboration',
  component: ComposerModeControl,
  args: { configuration: configured, disabled: false },
  render: (args): React.JSX.Element => (
    <View>
      <ComposerAgentModelControl {...args} />
      <ComposerModeControl {...args} />
    </View>
  ),
  beforeEach: (): void => {
    onConfigChange.mockClear();
  },
} satisfies Meta<typeof ComposerModeControl>;

export default meta;

type Story = StoryObj<typeof meta>;

function collaboration(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
      await expect(onConfigChange).not.toHaveBeenCalled();
      const mode = canvas.getByRole('button', { name: 'Mode' });

      if (width === layoutWidths.wide) {
        /*
         * Playwright's mouse is page-level and outlives the story file before this one, so it can
         * be resting where this menu's rows will draw. Chromium then re-fires a pointer move over
         * the row under it once the menu opens, and Radix focuses the menu above, which closes the
         * Plan submenu before the click lands (#1772, #1626). Park the real pointer on the Mode
         * button, outside the menu, so where it rests no longer depends on the story before.
         */
        await browserUserEvent.hover(mode);
      }

      await userEvent.click(mode);
      const overlay = within(document.body);
      await expect(onConfigChange).not.toHaveBeenCalled();

      if (width === layoutWidths.wide) {
        const trigger = await overlay.findByRole('menuitem', {
          name: /^Collaboration mode, Default/,
        });

        await userEvent.click(trigger);
        await expect(onConfigChange).not.toHaveBeenCalled();

        const plan = await overlay.findByRole('menuitemradio', {
          name: 'Plan',
        });

        /*
         * Storybook's userEvent fires pointerleave at (0, 0) with a null relatedTarget, which
         * unmounts the Plan submenu before pointerdown; the browser pointer moves naturally. That
         * pointer is aimed at the box the row had when it was measured, so the rows wait until both
         * menus have stopped moving: the one above is still zooming in, and the submenu rides the
         * row it hangs off (#1466). The wait follows the Plan row itself, since the submenu can still
         * be taking its place after the overlay's animations end (#1772).
         */
        await settleOverlays(plan);
        await browserUserEvent.click(plan);
      } else {
        await userEvent.click(
          await overlay.findByRole('button', {
            name: /^Collaboration mode, Default/,
          }),
        );
        await userEvent.click(
          await overlay.findByRole('radio', { name: 'Plan' }),
        );
      }

      await waitFor(() =>
        expect(onConfigChange).toHaveBeenCalledWith(
          'collaboration_mode',
          'plan',
        ),
      );
    },
  };
}

export const PermissionMenuWide = collaboration(layoutWidths.wide);

export const PermissionMenuPhone = collaboration(layoutWidths.phone);

export const ModelMenuExcludesCollaboration: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await expect(canvas.getByTestId('fast-mode-on')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Agent and model' }),
    );
    const overlay = within(document.body);
    // The menu fades in from opacity 0, so the switch is in the document before it is visible.
    const fast = await overlay.findByRole('switch', { name: 'Fast mode' });
    await waitFor(() => expect(fast).toBeInTheDocument());
    await expect(
      overlay.queryByRole('button', { name: /^Collaboration mode/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(overlay.getByText('Fast mode'));
    await expect(onConfigChange).toHaveBeenCalledWith('fast-mode', false);
  },
};
