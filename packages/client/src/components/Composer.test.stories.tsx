import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import {
  ComposerMock,
  composerImages,
  oversizedComposerImage,
} from '../../mocks/composer-mock';
import { Composer } from './Composer';

const meta = {
  title: 'Tests/Composer',
  component: Composer,
  render: (args) => <ComposerMock {...args} />,
  args: {
    draft: { text: '', images: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Attach images' }),
      ).toBeEnabled();
    }
  },
};

export const Typing: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.clear(input);
      await userEvent.type(input, 'Match the spacing.');
      await expect(input).toHaveValue('Match the spacing.');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await expect(args.onSend).toHaveBeenLastCalledWith({
        text: 'Match the spacing.',
        images: [],
      });
    }
  },
};

export const WithImages: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Attach images' }),
      );
      await expect(
        canvas.getByRole('img', { name: 'screenshot.png' }),
      ).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Remove screenshot.png' }),
      );
      await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    }
  },
};

export const Multiline: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.clear(input);
      await userEvent.type(
        input,
        'Match the spacing.\nKeep the phone readable.\nUse both themes.',
      );
      await expect(input).toHaveValue(
        'Match the spacing.\nKeep the phone readable.\nUse both themes.',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      await expect(args.onSend).toHaveBeenLastCalledWith({
        text: 'Match the spacing.\nKeep the phone readable.\nUse both themes.',
        images: [],
      });
    }
  },
};

export const ImageTooLarge: Story = {
  args: {
    draft: {
      text: 'Match these screenshots.',
      images: [oversizedComposerImage],
    },
  },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Image exceeds 20 MB.',
    );
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    await page.viewport(1440, 844);
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Image exceeds 20 MB.',
    );
    await expect(canvas.getByRole('textbox')).toBeEnabled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove full-screen.png' }),
    );
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
    await expect(canvas.getByRole('textbox')).toHaveValue(
      'Match these screenshots.',
    );
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
  },
};

export const Sending: Story = {
  args: { draft: { text: 'Match the spacing.', images: [] }, sending: true },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByRole('progressbar', { name: 'Sending' }),
      ).toBeVisible();
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Match the spacing.',
      );
      await userEvent.type(canvas.getByRole('textbox'), 'Another prompt');
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Match the spacing.',
      );
      await expect(
        canvas.getByRole('button', { name: 'Attach images' }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(args.onSend).not.toHaveBeenCalled();
    }
  },
};

export const Disabled: Story = {
  args: {
    draft: { text: 'Match the spacing.', images: composerImages.slice(0, 1) },
    disabled: true,
  },
  play: async ({ canvas, userEvent, args }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await userEvent.type(canvas.getByRole('textbox'), 'Another prompt');
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Match the spacing.',
      );
      await expect(
        canvas.getByRole('button', { name: 'Attach images' }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: 'Remove screenshot.png' }),
      ).toBeDisabled();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('img', { name: 'screenshot.png' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
      await expect(args.onDraftChange).not.toHaveBeenCalled();
      await expect(args.onSend).not.toHaveBeenCalled();
    }
  },
};

export const DraftsStayOnTheirDevice: Story = {
  render: (args) => (
    <View className="w-full gap-4">
      <View testID="first-device">
        <ComposerMock {...args} />
      </View>
      <View testID="second-device">
        <ComposerMock {...args} />
      </View>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const first = within(canvas.getByTestId('first-device'));
      const second = within(canvas.getByTestId('second-device'));
      await userEvent.clear(first.getByRole('textbox'));
      await userEvent.clear(second.getByRole('textbox'));
      await userEvent.type(first.getByRole('textbox'), 'Draft on this device.');
      await expect(second.getByRole('textbox')).toHaveValue('');
      await userEvent.type(second.getByRole('textbox'), 'A different draft.');
      await userEvent.click(first.getByRole('button', { name: 'Send' }));
      await expect(first.getByRole('textbox')).toHaveValue('');
      await expect(second.getByRole('textbox')).toHaveValue(
        'A different draft.',
      );
    }
  },
};
