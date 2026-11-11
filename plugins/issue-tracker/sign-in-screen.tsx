import {
  Button,
  Screen,
  Stack,
  Text,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { DeviceFlowState } from './device-flow';

type Run = ReturnType<PageTo['run']>;

// The Operations the buttons run, as values the App acts on (ADR-0050).
export type SignInActions = { start: Run; cancel: Run };

// What the sign-in draws: the flow where it stands, and why a token already in use was refused, when it was.
export type SignInData = { flow: DeviceFlowState; rejected: string | null };

type Step<Kind extends DeviceFlowState['kind']> = SignInActions & {
  flow: Extract<DeviceFlowState, { kind: Kind }>;
  rejected: string | null;
};

const msPerMinute = 60_000;

function Lines(props: { primary: string; secondary?: string }): JSX.Element {
  return (
    <>
      <Text role="secondary">{props.primary}</Text>
      {props.secondary ? <Text role="secondary">{props.secondary}</Text> : null}
    </>
  );
}

const SignedOut = (props: Step<'idle'>): JSX.Element => (
  <>
    <Lines primary={props.rejected ?? 'Sign in to use GitHub in Argo.'} />
    <Button label="Sign in to GitHub" onPress={props.start} />
  </>
);

const CodeButtons = ({ flow, cancel }: Step<'code'>): JSX.Element => (
  <>
    <Button
      label="Open GitHub"
      onPress={{ action: 'openUrl', url: flow.verificationUri }}
    />
    <Button
      label="Copy code"
      variant="secondary"
      onPress={{ action: 'copy', text: flow.userCode }}
    />
    <Button label="Cancel" variant="secondary" onPress={cancel} />
  </>
);

const Code = (props: Step<'code'>): JSX.Element => (
  <>
    <Lines
      primary="Enter this code on GitHub, on any device."
      secondary={`The code lasts ${Math.round(props.flow.lifetimeMs / msPerMinute)} minutes. Waiting for GitHub…`}
    />
    <Text role="code">{props.flow.userCode}</Text>
    <CodeButtons {...props} />
  </>
);

const endTitles = {
  denied: 'Sign-in was denied',
  expired: 'The code expired',
  failed: 'Couldn’t sign in',
} as const;

const Ended = (props: Step<'ended'>): JSX.Element => (
  <>
    <Lines
      primary={endTitles[props.flow.end]}
      secondary={props.flow.message}
    />
    <Button label="Try again" onPress={props.start} />
  </>
);

const SignedIn = ({ flow }: Step<'signed-in'>): JSX.Element => (
  <Lines
    primary={`Signed in as ${flow.label}`}
    secondary="Manage this Account in Settings › Accounts."
  />
);

const Requesting = (): JSX.Element => (
  <Lines primary="Asking GitHub for a code…" />
);

type Props = SignInActions & SignInData;

// The steps that wait on nothing: signed in, asking for a code, and the start.
function Rest({ flow, ...props }: Props): JSX.Element {
  if (flow.kind === 'signed-in') return <SignedIn flow={flow} {...props} />;

  return flow.kind === 'requesting' ? (
    <Requesting />
  ) : (
    <SignedOut flow={{ kind: 'idle' }} {...props} />
  );
}

// One step of the flow each, so the page draws every state the flow can be in.
function Body({ flow, ...props }: Props): JSX.Element {
  if (flow.kind === 'code') return <Code flow={flow} {...props} />;

  return flow.kind === 'ended' ? (
    <Ended flow={flow} {...props} />
  ) : (
    <Rest flow={flow} {...props} />
  );
}

// The sign-in page, drawn from kit components: every step of the device flow, and the way back after a refusal.
export function SignInScreen(props: SignInActions & SignInData): JSX.Element {
  return (
    <Screen title="GitHub">
      <Stack direction="column" gap={6}>
        <Body {...props} />
      </Stack>
    </Screen>
  );
}
