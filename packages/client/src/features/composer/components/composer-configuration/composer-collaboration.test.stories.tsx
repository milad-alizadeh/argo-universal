import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
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
    ...configuration.configOptions,
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
      await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
      const overlay = within(document.body);

      if (width === layoutWidths.wide) {
        await userEvent.click(
          await overlay.findByRole('menuitem', {
            name: /^Collaboration mode, Default/,
          }),
        );
        await userEvent.click(
          await overlay.findByRole('menuitemradio', { name: 'Plan' }),
        );
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

      await expect(onConfigChange).toHaveBeenCalledWith(
        'collaboration_mode',
        'plan',
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
