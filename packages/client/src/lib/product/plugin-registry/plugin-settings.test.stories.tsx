import type { WireNode } from '@repo/contracts/plugins/wire';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
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
  play: async ({ canvas, canvasElement }) => {
    await settleViewport(1440);
    await canvas.findByText('Fast mode');
    // Expo's web switch keeps its unnamed input out of pointer reach, so the change is fired on the input itself.
    const input = canvasElement.querySelector('input');

    if (!input) throw new Error('The Toggle row draws no switch input');
    await fireEvent.click(input);
    await expect(onEvent).toHaveBeenCalledWith('settings/section/fast', {
      event: 'onValueChange',
      payload: true,
    });
  },
};

export const FieldDraftSurvivesEventDelivery: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(1440);
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
