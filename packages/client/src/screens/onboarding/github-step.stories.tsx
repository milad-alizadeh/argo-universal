import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { stepMarks } from '#features/setup';
import { GitHubStepView } from './github-step';
import { githubSteps } from './onboarding-view.mocks';

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
  title: 'Screens/Onboarding/GitHub step',
  component: GitHubStepView,
} satisfies Meta;

export default meta;

type Story = StoryObj;

// The AccountRow chips and captions designed for Settings › Accounts in Paper.
export const GitHubStep: Story = {
  name: 'GitHubStep',
  render: GitHubSteps,
};
