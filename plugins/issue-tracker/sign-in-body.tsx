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
}: Pick<BodyProps, 'start' | 'reauthorize'>) {
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
      <Text role="heading" tone="danger">
        {title}
      </Text>
      <Text role="secondary">{detail}</Text>
      <Button label="Try again" onPress={start} />
    </>
  );
}

function Step(props: BodyProps): JSX.Element | null {
  const { step, start } = props;

  switch (step.kind) {
    case 'idle':
      return <Idle start={start} reauthorize={props.reauthorize} />;
    case 'requesting':
      return <Requesting />;
    case 'code':
      return <CodeShown cancel={props.cancel} step={step} />;
    case 'signed-in':
      return <Text role="heading">Signed in as {step.label}</Text>;
    case 'denied':
      return (
        <Failure
          title="Sign-in was denied"
          detail="You turned the request down on GitHub."
          start={start}
        />
      );
    case 'expired':
      return (
        <Failure
          title="The code expired"
          detail="GitHub codes last 15 minutes. Ask for a new one."
          start={start}
        />
      );
    case 'failed':
      return (
        <Failure title="Couldn’t sign in" detail={step.message} start={start} />
      );
  }
}

export function SignInBody(props: BodyProps): JSX.Element {
  return (
    <Stack direction="column" gap={6}>
      <Text role="title">GitHub</Text>
      <Step {...props} />
    </Stack>
  );
}
