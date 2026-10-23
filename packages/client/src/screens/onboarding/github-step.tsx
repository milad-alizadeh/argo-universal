import { Button } from '@repo/kit/primitives/actions/button';
import type { Tone } from '@repo/kit/primitives/content/text';
import { Pill } from '@repo/kit/primitives/status/pill';
import type * as React from 'react';
import { type GitHubStep, type StepMark } from '#features/setup';
import type { OnboardingViewProps } from './onboarding-props';
import { SetupStep, type SetupStepProps } from './setup-step';

// `onConnectGitHub` is unset until the App can sign in to GitHub.
export type GitHubStepViewProps = Pick<
  OnboardingViewProps,
  'github' | 'onConnectGitHub'
> & { mark: StepMark };

interface GitHubContent {
  chip?: { label: string; tone: Tone };
  caption: string;
  // The outline button, for the states that start a sign-in.
  connect?: string;
  // Signed in: a link to sign in with another account.
  anotherAccount?: boolean;
}

// The AccountRow chips and captions designed for Settings › Accounts in Paper, by the signed-in login where there is one.
const githubContents: Record<
  GitHubStep['status'],
  (login: string) => GitHubContent
> = {
  'not-connected': () => ({
    caption: 'Optional. Clone repositories, open pull requests, read Issues.',
    connect: 'Connect',
  }),
  'login-found': (login) => ({
    chip: { label: 'Login found', tone: 'info' },
    caption: `The GitHub CLI is signed in as ${login}.`,
    connect: 'Connect',
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
    connect: 'Sign in again',
  }),
};

const githubContent = (step: GitHubStep): GitHubContent =>
  githubContents[step.status]('login' in step ? step.login : '');

const chipView = (chip: GitHubContent['chip']): React.ReactNode =>
  chip && <Pill tone={chip.tone} text={chip.label} />;

type OnConnect = GitHubStepViewProps['onConnectGitHub'];

const anotherAccountLink = (onConnect: OnConnect): React.JSX.Element => (
  <Button
    label="Sign in with another account"
    variant="text"
    size="sm"
    disabled={!onConnect}
    onPress={onConnect}
  />
);

const connectButton = (
  label: string,
  onConnect: OnConnect,
): React.JSX.Element => (
  <Button
    label={label}
    variant="secondary"
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
