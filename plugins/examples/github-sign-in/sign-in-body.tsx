import { Button, ListItem, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Account, SignInView } from './sign-in-view';

export type Actions = { start: () => void; cancel: () => void };

type Lines = { primary: string; secondary?: string };

function Lines({ primary, secondary }: Lines): JSX.Element {
  return (
    <>
      <Text role="secondary">{primary}</Text>
      {secondary ? <Text role="secondary">{secondary}</Text> : null}
    </>
  );
}

function SignedIn({ account }: { account: Account }): JSX.Element {
  return (
    <>
      <ListItem title={account.label} subtitle={account.host} />
      <Lines primary="Signed in. Manage this Account in Settings › Accounts." />
    </>
  );
}

function SignedOut({ start }: Pick<Actions, 'start'>): JSX.Element {
  return (
    <>
      <Lines primary="Sign in to use GitHub in Argo." />
      <Button label="Sign in to GitHub" onPress={start} />
    </>
  );
}

function InProgress({ cancel }: Pick<Actions, 'cancel'>): JSX.Element {
  return (
    <>
      <Lines
        primary="Finish signing in in your browser."
        secondary="Waiting for GitHub…"
      />
      <Button label="Cancel" variant="outline" onPress={cancel} />
    </>
  );
}

type Failure = { title: string; message: string; start: () => void };

function Failure({ title, message, start }: Failure): JSX.Element {
  return (
    <>
      <Lines primary={title} secondary={message} />
      <Button label="Try again" onPress={start} />
    </>
  );
}

type Flowing = Actions & { view: Exclude<SignInView, { kind: 'signed-in' }> };

function FlowBody({ view, start, cancel }: Flowing): JSX.Element {
  if (view.kind === 'waiting') return <InProgress cancel={cancel} />;

  return view.kind === 'failed' ? (
    <Failure title={view.title} message={view.message} start={start} />
  ) : (
    <SignedOut start={start} />
  );
}

// Signed in on any device; otherwise the Server Device decides what is drawn.
export function Body({
  view,
  ...actions
}: Actions & { view: SignInView }): JSX.Element {
  if (view.kind === 'signed-in') return <SignedIn account={view.account} />;

  if (view.kind === 'continue-on-server-device')
    return (
      <Lines
        primary="Continue on the Server Device"
        secondary="Open GitHub in Argo on the Server Device to sign in. This device will update when you’re done."
      />
    );

  return <FlowBody view={view} {...actions} />;
}
