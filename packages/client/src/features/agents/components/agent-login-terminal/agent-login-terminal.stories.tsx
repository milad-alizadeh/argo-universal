import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import TerminalRenderer from './terminal-renderer';
import { readTerminalFrame } from './terminal.mocks';
import { useTerminalAppearance } from './use-terminal-appearance';

const meta = {
  title: 'Agents/AgentLoginTerminal',
  component: TerminalRenderer,
  render: (args): React.JSX.Element => <ThemedTerminal {...args} />,
  args: {
    enabled: true,
    height: 320,
    compact: false,
    keyboardOpen: false,
    dom: {
      containerStyle: { flex: 0, width: '100%', height: 320 },
      style: { height: 320 },
    },
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

export const Desktop: Story = {};

export const PhoneKeyboard: Story = {
  args: {
    compact: true,
    height: 120,
    keyboardOpen: true,
    dom: {
      containerStyle: { flex: 0, width: '100%', height: 182 },
      style: { height: 182 },
    },
  },
};
