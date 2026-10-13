import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { stepMarks } from '../../state/get-started';
import { githubSteps } from './get-started-view.mocks';
import { GitHubStepView } from './github-step';

const agentDone = { status: 'done', agentName: 'Claude' } as const;

function GitHubSteps(): React.JSX.Element {
  return (
    <Variations>
      {Object.entries(githubSteps).map(([name, step]) => (
        <Variation key={name} label={step.status}>
          <GitHubStepView
            github={step}
            mark={stepMarks(agentDone, step).github}
            onConnectGitHub={fn()}
          />
        </Variation>
      ))}
    </Variations>
  );
}

const meta = {
  title: 'Setup/GitHubStep',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// The chips and captions of Settings › Accounts' AccountRow.
export const GitHubStep: Story = {
  name: 'GitHubStep',
  render: GitHubSteps,
};
