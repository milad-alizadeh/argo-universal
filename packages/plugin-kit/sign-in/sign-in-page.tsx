import { Screen, useEffect, usePageContext, useState } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { DefinedAccount } from './define-account';
import { SignInBody } from './sign-in-body';
import type { SignInNeed, SignInStep, StartedRun } from './steps';

type PageProps = {
  account: DefinedAccount;
  // Why the page is up, when a read sent the person here; "Add account" opens it without one and adds an Account.
  need?: SignInNeed;
  projectId?: string;
  onSignedIn?: () => void | Promise<void>;
};

type Attempts = { begin: () => () => boolean; stop: () => void };

// Starting another sign-in, cancelling or leaving the page ends the one before; the service's code simply goes unused.
function createAttempts(): Attempts {
  let current = 0;

  return {
    begin: () => {
      current += 1;

      const mine = current;

      return () => current !== mine;
    },
    stop: () => {
      current += 1;
    },
  };
}

function useAttempts(): Attempts {
  const [attempts] = useState(createAttempts);

  useEffect(() => attempts.stop, [attempts]);

  return attempts;
}

type Flow = { step: SignInStep; start: () => void; cancel: () => void };

const runOf = (
  { need = 'no-account', projectId }: PageProps,
  run: Pick<StartedRun, 'show' | 'cancelled'>,
): StartedRun => ({ need, projectId, ...run });

function useShow(
  { onSignedIn }: PageProps,
  setStep: (step: SignInStep) => void,
): StartedRun['show'] {
  return (next) => {
    setStep(next);

    if (next.kind === 'signed-in') void onSignedIn?.();
  };
}

function useFlow(props: PageProps): Flow {
  const [step, setStep] = useState<SignInStep>({ kind: 'idle' });
  const attempts = useAttempts();
  const show = useShow(props, setStep);

  const start = (): void => {
    const run = runOf(props, { show, cancelled: attempts.begin() });

    void props.account.signIn(run);
  };

  const cancel = (): void => {
    attempts.stop();
    setStep({ kind: 'idle' });
  };

  return { step, start, cancel };
}

// The page that signs in. Argo opens it for "Add account"; a gate draws it in place of a page that cannot read.
export function SignInPage(props: PageProps): JSX.Element {
  const flow = useFlow(props);
  const { serverDevice } = usePageContext();
  const { name, flow: kind } = props.account.declaration;

  return (
    <Screen title={name}>
      <SignInBody
        {...flow}
        name={name}
        rejected={props.need === 'rejected'}
        // `argo.oauth` is refused away from the Server Device (ADR-0036), whose browser the redirect needs.
        elsewhere={kind === 'redirect' && !serverDevice}
      />
    </Screen>
  );
}
