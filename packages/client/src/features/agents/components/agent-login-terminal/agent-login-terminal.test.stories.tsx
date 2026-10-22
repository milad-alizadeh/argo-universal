import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within, waitFor } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import TerminalRenderer from './terminal-renderer';
import { readTerminalFrame } from './terminal.mocks';
import { useTerminalAppearance } from './use-terminal-appearance';

const meta = {
  title: 'Tests/Agents/AgentLoginTerminal',
  component: TerminalRenderer,
  render: (args): React.JSX.Element => <ThemedTerminal {...args} />,
  args: {
    enabled: true,
    height: 320,
    compact: false,
    keyboardOpen: false,
    onRead: fn(readTerminalFrame),
    onInput: fn(),
    onFailure: fn(),
  },
} satisfies Meta<typeof TerminalRenderer>;

export default meta;

// The host reads the colour tokens and hands them to the DOM component, as AgentLoginTerminal does.
function ThemedTerminal(
  props: React.ComponentProps<typeof TerminalRenderer>,
): React.JSX.Element {
  return <TerminalRenderer {...props} appearance={useTerminalAppearance()} />;
}

type Story = StoryObj<typeof meta>;

export const DirectKeyboardInput: Story = {
  play: async ({ canvasElement, userEvent, args }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole('textbox');
    await userEvent.click(input);
    await browserUser.keyboard('a{Enter}{ArrowUp}{Backspace}');
    await expect(args.onFailure).not.toHaveBeenCalled();
    await expect(args.onInput).toHaveBeenCalledWith({
      type: 'write',
      text: 'a',
    });
    await expect(args.onInput).toHaveBeenCalledWith({
      type: 'write',
      text: '\r',
    });
    await waitFor(() =>
      expect(args.onInput).toHaveBeenCalledWith({
        type: 'write',
        text: '\u007f',
      }),
    );
    await expect(args.onInput).toHaveBeenCalledWith({
      type: 'write',
      text: '\u001b[A',
    });
  },
};

export const PhoneSpecialKeys: Story = {
  args: { compact: true, keyboardOpen: true, height: 120 },
  play: async ({ canvasElement, userEvent, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: 'Tab' }));
    await userEvent.click(canvas.getByRole('button', { name: '↑' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Ctrl' }));
    await userEvent.click(canvas.getByRole('textbox'));
    await userEvent.keyboard('c');
    await expect(args.onFailure).not.toHaveBeenCalled();
    await expect(args.onInput).toHaveBeenCalledWith({
      type: 'write',
      text: '\t',
    });
    await expect(args.onInput).toHaveBeenCalledWith({
      type: 'write',
      text: '\u001b[A',
    });
    await expect(args.onInput).toHaveBeenCalledWith({
      type: 'write',
      text: '\u0003',
    });
    await expect(canvas.getByRole('button', { name: 'Ctrl' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};

export const DisconnectedIgnoresInput: Story = {
  args: { enabled: false, compact: true, keyboardOpen: true },
  play: async ({ canvasElement, userEvent, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('textbox'));
    await userEvent.keyboard('x{Enter}');
    await expect(args.onInput).not.toHaveBeenCalled();
    await expect(args.onRead).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('toolbar')).toBeNull();
  },
};
