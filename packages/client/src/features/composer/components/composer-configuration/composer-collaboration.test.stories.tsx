import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
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
  title: 'Tests/ComposerCollaboration',
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
      await settleViewport(width);
      await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
      const overlay = within(document.body);
      await userEvent.click(
        await overlay.findByRole('button', {
          name: /^Collaboration mode, Default/,
        }),
      );
      await userEvent.click(
        await overlay.findByRole('radio', { name: 'Plan' }),
      );
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
    await settleViewport(layoutWidths.wide);
    await expect(canvas.getByTestId('fast-mode-on')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Agent and model' }),
    );
    const overlay = within(document.body);
    // The menu fades in from opacity 0, so the switch is in the document before it is visible.
    const fast = await overlay.findByRole('switch', { name: 'Fast mode' });
    await waitFor(() => expect(fast).toBeVisible());
    await expect(
      overlay.queryByRole('button', { name: /^Collaboration mode/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(fast);
    await expect(onConfigChange).toHaveBeenCalledWith('fast-mode', false);
  },
};
