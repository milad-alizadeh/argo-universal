import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { settleViewport } from '../../generic/settle-viewport';
import { PluginTree } from './plugin-registry';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

const root: WireNode = {
  ...node('GroupedList', 'settings', {}),
  children: [
    node('ListItem.Toggle', 'fast', {
      title: 'Fast mode',
      value: false,
      onValueChange: { $event: 'onValueChange' },
    }),
    node('ListItem.TextField', 'name', {
      label: 'Name',
      value: '',
      onChangeText: { $event: 'onChangeText' },
    }),
  ],
};

const onEvent = fn();

const meta = {
  title: 'Tests/Plugin settings rows',
  component: PluginTree,
  args: { root, onEvent },
  parameters: { screenPreview: true },
  beforeEach: (): void => {
    onEvent.mockClear();
  },
} satisfies Meta<typeof PluginTree>;

export default meta;

export const LegacyListUsesSettingsWrappers: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(1440);
    await userEvent.click(
      await canvas.findByRole('switch', { name: 'Fast mode' }),
    );
    await expect(onEvent).toHaveBeenCalledWith('settings/fast', {
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
      expect(onEvent).toHaveBeenLastCalledWith('settings/name', {
        event: 'onChangeText',
        payload: 'Argo',
      }),
    );
  },
};

export const LegacyRowPreservesDetailAndFooter: StoryObj<typeof meta> = {
  args: {
    root: {
      ...node('GroupedListItem', 'legacy', { label: 'Legacy setting' }),
      slots: {
        detail: [node('Text', 'detail', { children: 'Detail content' })],
        footer: [node('Text', 'footer', { children: 'Footer content' })],
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Detail content')).toBeVisible();
    await expect(canvas.getByText('Footer content')).toBeVisible();
  },
};
