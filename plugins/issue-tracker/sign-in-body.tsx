import { Button, Code, Link, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { FlowStep } from './device-flow';

// The page before the person has started: nothing has been asked of GitHub.
export type SignInStep = FlowStep | { kind: 'idle' };

export type Actions = { start: () => void; cancel: () => void };

type BodyProps = Actions & { step: SignInStep; reauthorize: boolean };

const idleText = (reauthorize: boolean): string =>
  reauthorize
    ? 'GitHub no longer accepts the saved sign-in. Sign in again to keep reading and changing Issues.'
    : 'Sign in to GitHub to read and change this Project’s Issues.';

function Idle({
  start,
  reauthorize,
}: Pick<BodyProps, 'start' | 'reauthorize'>): JSX.Element {
  return (
    <>
      <Text role="secondary">{idleText(reauthorize)}</Text>
      <Button label="Sign in to GitHub" onPress={start} />
    </>
  );
}

function Requesting(): JSX.Element {
  return (
    <>
      <Text role="secondary">Asking GitHub for a code…</Text>
      <Button label="Sign in to GitHub" loading disabled />
    </>
  );
}

type CodeProps = Pick<Actions, 'cancel'> & {
  step: Extract<FlowStep, { kind: 'code' }>;
};

function CodeShown({ cancel, step }: CodeProps): JSX.Element {
  return (
    <>
      <Text role="secondary">
        Enter this code on GitHub to finish signing in.
      </Text>
      <Code code={step.userCode} />
      <Link label={step.verificationUri} href={step.verificationUri} />
      <Text role="secondary">Waiting for you to approve it…</Text>
      <Button label="Cancel" variant="secondary" onPress={cancel} />
    </>
  );
}

type FailureProps = { title: string; detail: string; start: () => void };

function Failure({ title, detail, start }: FailureProps): JSX.Element {
  return (
    <>
      <Text role="body" tone="danger">
        {title}
      </Text>
      <Text role="secondary">{detail}</Text>
      <Button label="Try again" onPress={start} />
    </>
  );
}

type Progress = Extract<SignInStep, { kind: 'idle' | 'requesting' | 'code' }>;

type Outcome = Exclude<SignInStep, Progress>;

const isProgress = (step: SignInStep): step is Progress =>
  step.kind === 'idle' || step.kind === 'requesting' || step.kind === 'code';

function ProgressView(props: BodyProps & { step: Progress }): JSX.Element {
  const { step, start, cancel, reauthorize } = props;

  if (step.kind === 'idle')
    return <Idle start={start} reauthorize={reauthorize} />;

  if (step.kind === 'requesting') return <Requesting />;

  return <CodeShown cancel={cancel} step={step} />;
}

const endings = {
  denied: {
    title: 'Sign-in was denied',
    detail: 'You turned the request down on GitHub.',
  },
  expired: {
    title: 'The code expired',
    detail: 'GitHub codes last 15 minutes. Ask for a new one.',
  },
} as const;

function OutcomeView({
  step,
  start,
}: Pick<BodyProps, 'start'> & { step: Outcome }): JSX.Element {
  if (step.kind === 'signed-in')
    return <Text role="body">Signed in as {step.label}</Text>;

  if (step.kind === 'failed')
    return (
      <Failure title="Couldn’t sign in" detail={step.message} start={start} />
    );

  return <Failure {...endings[step.kind]} start={start} />;
}

function Step(props: BodyProps): JSX.Element {
  const { step } = props;

  return isProgress(step) ? (
    <ProgressView {...props} step={step} />
  ) : (
    <OutcomeView step={step} start={props.start} />
  );
}

export function SignInBody(props: BodyProps): JSX.Element {
  return (
    <Stack direction="column" gap={6}>
      <Step {...props} />
    </Stack>
  );
}
