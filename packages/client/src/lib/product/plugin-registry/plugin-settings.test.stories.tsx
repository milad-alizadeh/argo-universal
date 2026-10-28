import type { WireNode } from '@repo/contracts/plugins/wire';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

const root: WireNode = {
  ...node('FieldGroup', 'settings', {}),
  children: [
    {
      ...node('FieldGroup.Section', 'section', {}),
      children: [
        node('FieldGroup.Toggle', 'fast', {
          title: 'Fast mode',
          value: false,
          onValueChange: { $event: 'onValueChange' },
        }),
        node('FieldGroup.TextField', 'name', {
          title: 'Name',
          value: '',
          onChangeText: { $event: 'onChangeText' },
        }),
      ],
    },
  ],
};

const onEvent = fn();

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Settings',
  component: PluginTree,
  args: { root, onEvent },
  parameters: { screenPreview: true },
  beforeEach: (): void => {
    onEvent.mockClear();
  },
} satisfies Meta<typeof PluginTree>;

export default meta;

export const FieldGroupDrawsSettingsRows: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(await canvas.findByText('Fast mode'));
    await expect(onEvent).toHaveBeenCalledWith('settings/section/fast', {
      event: 'onValueChange',
      payload: true,
    });
  },
};

export const FieldDraftSurvivesEventDelivery: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const name = await canvas.findByRole('textbox', { name: 'Name' });
    await userEvent.type(name, 'Argo');
    await expect(name).toHaveValue('Argo');
    await waitFor(() =>
      expect(onEvent).toHaveBeenLastCalledWith('settings/section/name', {
        event: 'onChangeText',
        payload: 'Argo',
      }),
    );
  },
};
