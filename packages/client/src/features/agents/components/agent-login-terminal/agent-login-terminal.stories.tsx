import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import {
  desktopTerminal,
  phoneKeyboardTerminal,
} from './agent-login-terminal-fixtures';
import TerminalRenderer from './terminal-renderer';
import { readTerminalFrame } from './terminal.mocks';
import { useTerminalAppearance } from './use-terminal-appearance';

const meta = {
  title: 'Agents/AgentLoginTerminal',
  component: TerminalRenderer,
  render: (args): React.JSX.Element => <ThemedTerminal {...args} />,
  args: {
    ...desktopTerminal,
    onRead: fn(readTerminalFrame),
    onInput: fn(),
    onFailure: fn(),
  },
  argTypes: {
    enabled: { control: 'boolean' },
    height: { control: 'number' },
    keyboardOpen: { control: 'boolean' },
    compact: { control: 'boolean' },
    appearance: { control: false },
    dom: { control: false },
    onRead: { control: false },
    onInput: { control: false },
    onFailure: { control: false },
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

// A desktop window: the terminal takes its full height and draws no key accessory.
export const Desktop: Story = { args: desktopTerminal };

// A phone with the keyboard up: the viewport shrinks and the keys sit above it.
export const PhoneKeyboard: Story = { args: phoneKeyboardTerminal };
