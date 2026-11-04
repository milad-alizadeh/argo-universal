import { Button, ListItem, Text, type PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Account, SignInView } from './sign-in-view';

type Run = ReturnType<PageTo<Record<never, never>>['run']>;

// The Operations the buttons run, as values the App acts on (ADR-0050).
export type Actions = { start: Run; cancel: Run };

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
      <Button label="Cancel" variant="secondary" onPress={cancel} />
    </>
  );
}

type Failure = { title: string; message: string; start: Run };

function Failure({ title, message, start }: Failure): JSX.Element {
  return (
    <>
      <Lines primary={title} secondary={message} />
      <Button label="Try again" onPress={start} />
    </>
  );
}

type NotSignedIn = Exclude<
  SignInView,
  { kind: 'signed-in' } | { kind: 'continue-on-server-device' }
>;

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

  return <SignIn view={view} {...actions} />;
}

// The Server Device's sign-in, where it stands.
function SignIn({
  view,
  start,
  cancel,
}: Actions & { view: NotSignedIn }): JSX.Element {
  if (view.kind === 'waiting') return <InProgress cancel={cancel} />;

  if (view.kind === 'failed')
    return <Failure title={view.title} message={view.message} start={start} />;

  return <SignedOut start={start} />;
}
