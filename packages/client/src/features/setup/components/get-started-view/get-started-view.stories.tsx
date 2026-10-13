import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { GetStartedView } from './get-started-view';
import { getStartedArgs, githubSteps } from './get-started-view.mocks';

const meta = {
  title: 'Screens/Setup/Get started',
  component: GetStartedView,
  args: getStartedArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof GetStartedView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const GetStarted: Story = {};

// Step 1 holds the primary action; Add Project waits with an outline button.
export const NoAgentFound: Story = {
  args: { agent: { status: 'not-found', checking: false } },
};

// What the App shows today: no GitHub sign-in or Add Project flow yet, so their buttons are disabled.
export const FirstRun: Story = {
  args: {
    github: githubSteps.notConnected,
    onConnectGitHub: undefined,
    onAddProject: undefined,
  },
};
