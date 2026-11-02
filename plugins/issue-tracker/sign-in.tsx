import { Screen, useEffect, useRef, useState } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { GitHubSignIn } from './github-sign-in';
import { SignInBody, type SignInStep } from './sign-in-body';

export type SignInProps = {
  signIn: GitHubSignIn;
  // The saved token was rejected: sign in again to rewrite it, not to add a second Account.
  reauthorize?: boolean;
  // Called once the Account is saved, so the page that asked can read again.
  onSignedIn?: () => void;
};

type Flow = {
  step: SignInStep;
  start: () => void;
  cancel: () => void;
};

function useFlow({
  signIn,
  reauthorize = false,
  onSignedIn,
}: SignInProps): Flow {
  const [step, setStep] = useState<SignInStep>({ kind: 'idle' });
  const attempt = useRef(0);

  // A page that closes stops waiting; GitHub's code simply goes unused.
  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  const start = (): void => {
    attempt.current += 1;

    const mine = attempt.current;

    void signIn.start({
      reauthorize,
      cancelled: () => attempt.current !== mine,
      show: (next) => {
        setStep(next);

        if (next.kind === 'signed-in') onSignedIn?.();
      },
    });
  };

  const cancel = (): void => {
    attempt.current += 1;
    setStep({ kind: 'idle' });
  };

  return { step, start, cancel };
}

// Drawn in place of a page whenever a borrow of the GitHub Account returns nothing (ADR-0036), and as the Account's own page.
export function SignIn(props: SignInProps): JSX.Element {
  const flow = useFlow(props);

  return (
    <Screen title="GitHub">
      <SignInBody {...flow} reauthorize={props.reauthorize ?? false} />
    </Screen>
  );
}
