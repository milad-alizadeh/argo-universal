import { WireNode } from '@repo/contracts/plugins/wire';
import steps from '@repo/mocks/plugins/sign-in.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { PluginTree, type PluginTreeProps } from './plugin-registry';

// Each step is the wire tree the Plugin kit's `signInScreen` draws, recorded by its own test.
const step = (name: keyof typeof steps): Pick<PluginTreeProps, 'root'> => ({
  root: WireNode.parse(steps[name]),
});

// The one sign-in card every Plugin with an OAuth flow shares; one story per step of either flow.
const meta = {
  title: 'Design System/Patterns/PluginSignIn',
  component: PluginTree,
  parameters: { screenPreview: true },
  argTypes: { root: { control: false }, onPageCall: { control: false } },
  args: { ...step('signedOut'), onPageCall: action('Page call') },
} satisfies Meta<typeof PluginTree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = { args: step('signedOut') };

// A Plugin that ships the service's logo: it fills the mark in place of the Plugin's own icon.
export const WithLogo: Story = { args: step('withLogo') };

// The service refused the token: its own words replace the purpose line.
export const Refused: Story = { args: step('refused') };

export const Requesting: Story = { args: step('requesting') };

// A redirect flow: the person finishes in the browser, and the page updates by itself.
export const Waiting: Story = { args: step('waiting') };

// A device flow: one press copies the code, then opens the page that asks for it.
export const Code: Story = { args: step('code') };

export const SignedIn: Story = { args: step('signedIn') };

export const Ended: Story = { args: step('ended') };

// A redirect flow on a Device that is not the Server Device has nothing to press.
export const ServerDevice: Story = { args: step('serverDevice') };
