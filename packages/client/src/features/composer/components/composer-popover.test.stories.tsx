import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { ComposerPopover } from './composer-popover';

const meta = {
  title: 'Tests/ComposerPopover',
  component: ComposerPopover,
  parameters: { screenPreview: true },
  render: (args): React.JSX.Element => (
    <View className="flex-1 justify-end items-start p-4">
      <ComposerPopover {...args} />
    </View>
  ),
} satisfies Meta<typeof ComposerPopover>;
export default meta;

function transitions(width: number): StoryObj<typeof meta> {
  let closingFinished = false;
  let callbackDuringAnimation = false;
  const afterClose = fn(() => ({
    closingFinished,
    mounted: !!document.querySelector('[role="dialog"]'),
  }));
  return {
    args: {
      label: 'Session settings',
      trigger: (
        <Button>
          <Text>Settings</Text>
        </Button>
      ),
      children: (close) => (
        <Button onPress={() => close(afterClose)}>
          <Text>Choose setting</Text>
        </Button>
      ),
    },
    beforeEach: () => {
      afterClose.mockClear();
      closingFinished = false;
      callbackDuringAnimation = false;
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: 'Settings' });
      await userEvent.click(trigger);
      const overlay = within(document.body);
      const dialog = await overlay.findByRole('dialog');
      const entering = dialog.getAnimations();
      await expect(entering.length).toBeGreaterThan(0);
      await Promise.all(entering.map((animation) => animation.finished));
      dialog.addEventListener('animationstart', () => {
        if (dialog.dataset.state === 'closed')
          callbackDuringAnimation = afterClose.mock.calls.length > 0;
      });
      dialog.addEventListener('animationend', () => {
        if (dialog.dataset.state === 'closed') closingFinished = true;
      });
      await userEvent.click(
        overlay.getByRole('button', { name: 'Choose setting' }),
      );
      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      await waitFor(() => expect(afterClose).toHaveBeenCalledOnce());
      await expect(callbackDuringAnimation).toBe(false);
      await expect(afterClose).toHaveReturnedWith({
        closingFinished: true,
        mounted: false,
      });
      await expect(trigger).toHaveFocus();
      await userEvent.click(trigger);
      await overlay.findByRole('dialog');
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      await expect(afterClose).toHaveBeenCalledOnce();
    },
  };
}

export const SheetTransitions = transitions(layoutWidths.phone);
export const PopoverTransitions = transitions(layoutWidths.wide);
