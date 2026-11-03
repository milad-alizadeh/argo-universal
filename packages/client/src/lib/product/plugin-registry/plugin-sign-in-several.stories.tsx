import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';

// The tree the kit's `SignInGate` (@argo/plugin-kit/sign-in) sends for several Accounts and no Project, as the harness received it.
const severalAccounts = WireNode.parse(
  JSON.parse(
    `{"type":"Screen","key":"0","props":{"title":"GitHub","width":"narrow"},"children":[{"type":"Text","key":"0","props":{"children":"Several GitHub Accounts are signed in. Open this from a Project, or sign out of one in Settings.","role":"secondary"},"children":[],"slots":{}}],"slots":{}}`,
  ),
);

const meta = {
  title: 'Design System/Patterns/PluginSignInSeveral',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <PluginDetailView
      root={severalAccounts}
      callbacks={{ onEvent: () => {} }}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const WideLight: Story = {
  globals: { mode: 'light', viewport: { value: 'desktop' } },
};

export const NarrowDark: Story = {
  globals: { mode: 'dark', viewport: { value: 'phone' } },
};
