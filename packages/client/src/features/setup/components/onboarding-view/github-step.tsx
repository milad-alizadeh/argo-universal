import type * as React from 'react';
import {
  Badge,
  type BadgeTone,
} from '#lib/generic/primitives/display/badge/badge';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Button } from '../../../../lib/generic/primitives/buttons/button/button';
import type { GitHubStep, StepMark } from '../../state/onboarding';
import type { OnboardingViewProps } from './onboarding-props';
import { SetupStep, type SetupStepProps } from './setup-step';

// `onConnectGitHub` is unset until the App can sign in to GitHub.
export type GitHubStepViewProps = Pick<
  OnboardingViewProps,
  'github' | 'onConnectGitHub'
> & { mark: StepMark };

interface GitHubContent {
  chip?: { label: string; tone: BadgeTone };
  caption: string;
  // The outline button, for the states that start a sign-in.
  connect?: { label: string; accessibilityLabel: string };
  // Signed in: a link to sign in with another account.
  anotherAccount?: boolean;
}

const connectGitHub = {
  label: 'Connect',
  accessibilityLabel: 'Connect GitHub',
};

// The AccountRow chips and captions designed for Settings › Accounts in Paper, by the signed-in login where there is one.
const githubContents: Record<
  GitHubStep['status'],
  (login: string) => GitHubContent
> = {
  'not-connected': () => ({
    caption: 'Optional. Clone repositories, open pull requests, read Issues.',
    connect: connectGitHub,
  }),
  'login-found': (login) => ({
    chip: { label: 'Login found', tone: 'info' },
    caption: `The GitHub CLI is signed in as ${login}.`,
    connect: connectGitHub,
  }),
  'signing-in': () => ({
    chip: { label: 'Signing in…', tone: 'muted' },
    caption: 'Enter the code on GitHub to finish.',
  }),
  'signed-in': (login) => ({
    chip: { label: 'Signed in', tone: 'success' },
    caption: `Connected as ${login}`,
    anotherAccount: true,
  }),
  expired: (login) => ({
    chip: { label: 'Sign-in expired', tone: 'warning' },
    caption: `GitHub rejected the saved login for ${login}.`,
    connect: {
      label: 'Sign in again',
      accessibilityLabel: 'Sign in to GitHub again',
    },
  }),
};

const githubContent = (step: GitHubStep): GitHubContent =>
  githubContents[step.status]('login' in step ? step.login : '');

const chipView = (chip: GitHubContent['chip']): React.ReactNode =>
  chip && (
    <Badge tone={chip.tone}>
      <Text>{chip.label}</Text>
    </Badge>
  );

type OnConnect = GitHubStepViewProps['onConnectGitHub'];

const anotherAccountLink = (onConnect: OnConnect): React.JSX.Element => (
  <Button
    label="Sign in with another account"
    variant="link"
    size="xs"
    disabled={!onConnect}
    onPress={onConnect}
  />
);

const connectButton = (
  connect: NonNullable<GitHubContent['connect']>,
  onConnect: OnConnect,
): React.JSX.Element => (
  <Button
    {...connect}
    variant="outline"
    size="sm"
    disabled={!onConnect}
    onPress={onConnect}
  />
);

const stepParts = (
  content: GitHubContent,
  onConnect: OnConnect,
): Pick<SetupStepProps, 'chip' | 'footer' | 'action'> => ({
  chip: chipView(content.chip),
  footer: content.anotherAccount && anotherAccountLink(onConnect),
  action: content.connect && connectButton(content.connect, onConnect),
});

// Step 2: optional, so it never holds the primary button.
export function GitHubStepView(props: GitHubStepViewProps): React.JSX.Element {
  const content = githubContent(props.github);

  return (
    <SetupStep
      number={2}
      mark={props.mark}
      title="Connect GitHub"
      caption={content.caption}
      {...stepParts(content, props.onConnectGitHub)}
    />
  );
}
