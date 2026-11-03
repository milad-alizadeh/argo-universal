import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';

// The tree the kit's sign-in pattern (@argo/plugin-kit/sign-in) sends for the device flow's code step, as the harness received it.
const codeStep = WireNode.parse(
  JSON.parse(
    `{"type":"Screen","key":"0","props":{"title":"Sign in to GitHub","width":"narrow"},"children":[{"type":"Stack","key":"0","props":{"gap":6,"direction":"column"},"children":[{"type":"Text","key":"0","props":{"children":"Enter this code on GitHub, then approve Argo.","role":"secondary"},"children":[],"slots":{}},{"type":"Surface","key":"1","props":{"kind":"tint","padding":4},"children":[{"type":"Stack","key":"0","props":{"gap":2,"direction":"column"},"children":[{"type":"Text","key":"0","props":{"children":"Your code","role":"badge","tone":"muted"},"children":[],"slots":{}},{"type":"Stack","key":"1","props":{"gap":2,"align":"center","direction":"row"},"children":[{"type":"Text","key":"0","props":{"children":"WDJB-MJHT","role":"title-code","selectable":true},"children":[],"slots":{}},{"type":"Spacer","key":"1","props":{},"children":[],"slots":{}},{"type":"IconButton","key":"2","props":{"icon":"copy","accessibilityLabel":"Copy code","onPress":{"action":"copy","text":"WDJB-MJHT"},"size":"sm","variant":"ghost"},"children":[],"slots":{}}],"slots":{}}],"slots":{}}],"slots":{}},{"type":"Stack","key":"2","props":{"gap":2,"direction":"column"},"children":[{"type":"ProgressBar","key":"0","props":{"value":0.72,"tone":"neutral","accessibilityLabel":"Time left on this code"},"children":[],"slots":{}},{"type":"Stack","key":"1","props":{"gap":4,"align":"center","direction":"row"},"children":[{"type":"Text","key":"0","props":{"children":"Waiting for you to approve it…","role":"badge","dimmed":true},"children":[],"slots":{}},{"type":"Spacer","key":"1","props":{},"children":[],"slots":{}},{"type":"Text","key":"2","props":{"children":"10:48","role":"badge","tone":"muted"},"children":[],"slots":{}}],"slots":{}}],"slots":{}},{"type":"Stack","key":"3","props":{"gap":2,"direction":{"compact":"column-reverse","wide":"row"}},"children":[{"type":"Spacer","key":"0","props":{},"children":[],"slots":{}},{"type":"Button","key":"1","props":{"label":"Cancel","variant":"secondary","onPress":{"$event":"onPress"},"fullWidth":"narrow"},"children":[],"slots":{}},{"type":"Button","key":"2","props":{"label":"Copy code and open GitHub","onPress":{"action":"sequence","steps":[{"action":"copy","text":"WDJB-MJHT"},{"action":"openUrl","url":"https://github.com/login/device"}]},"fullWidth":"narrow"},"children":[],"slots":{}}],"slots":{}}],"slots":{}}],"slots":{}}`,
  ),
);

const meta = {
  title: 'Design System/Patterns/PluginSignInCode',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CodeStep: Story = {
  render: () => (
    <PluginDetailView
      root={codeStep}
      callbacks={{ onEvent: () => {} }}
    />
  ),
};
