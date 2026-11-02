import { Button, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { CodeShown } from './code-step';
import type { Ended, SignInStep } from './steps';

type BodyProps = {
  step: SignInStep;
  name: string;
  rejected: boolean;
  elsewhere: boolean;
  start: () => void;
  cancel: () => void;
};

const idleText = ({ name, rejected }: BodyProps): string =>
  rejected
    ? `${name} no longer accepts the saved sign-in. Sign in again to continue.`
    : `Sign in to ${name} to continue.`;

const Elsewhere = ({ name }: Pick<BodyProps, 'name'>): JSX.Element => (
  <Text role="secondary">
    {`To sign in to ${name}, continue on the Server Device. The Account appears here when it is done.`}
  </Text>
);

function Idle(props: BodyProps): JSX.Element {
  if (props.elsewhere) return <Elsewhere name={props.name} />;

  return (
    <>
      <Text role="secondary">{idleText(props)}</Text>
      <Button label={`Sign in to ${props.name}`} onPress={props.start} />
    </>
  );
}

const Requesting = ({ name }: BodyProps): JSX.Element => (
  <>
    <Text role="secondary">{`Asking ${name} to start signing in…`}</Text>
    <Button label={`Sign in to ${name}`} loading disabled />
  </>
);

const InBrowser = ({ name, cancel }: BodyProps): JSX.Element => (
  <>
    <Text role="secondary">{`Finish signing in to ${name} in your browser.`}</Text>
    <Button label="Cancel" variant="secondary" onPress={cancel} />
  </>
);

type EndingProps = { step: Ended; start: () => void };

const Ending = ({ step, start }: EndingProps): JSX.Element => (
  <>
    <Text role="body" tone="danger">
      {step.title}
    </Text>
    <Text role="secondary">{step.detail}</Text>
    <Button label="Try again" onPress={start} />
  </>
);

const waiting = {
  idle: Idle,
  requesting: Requesting,
  browser: InBrowser,
};

type Waiting = Extract<SignInStep, { kind: keyof typeof waiting }>;

const WaitingStep = (props: BodyProps & { step: Waiting }): JSX.Element => {
  const View = waiting[props.step.kind];

  return <View {...props} />;
};

function Going(
  props: BodyProps & { step: Exclude<SignInStep, Ended> },
): JSX.Element {
  const { step } = props;

  if (step.kind === 'code') return <CodeShown {...props} step={step} />;

  return step.kind === 'signed-in' ? (
    <Text role="body">Signed in as {step.label}</Text>
  ) : (
    <WaitingStep {...props} step={step} />
  );
}

export function SignInBody(props: BodyProps): JSX.Element {
  const { step, start } = props;

  return (
    <Stack direction="column" gap={6}>
      {step.kind === 'ended' ? (
        <Ending step={step} start={start} />
      ) : (
        <Going {...props} step={step} />
      )}
    </Stack>
  );
}
