import { Screen, useEffect, useState } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { createAttempts } from './attempts';
import type { FlowStep } from './device-flow';
import type { GitHubSignIn } from './github-sign-in';
import { SignInBody, type SignInStep } from './sign-in-body';
import type { SignInNeed } from './use-github';

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

type FlowProps = Omit<SignInProps, 'reauthorize'> & { reauthorize: boolean };

const stepShower =
  (setStep: (step: SignInStep) => void, onSignedIn?: () => void) =>
  (next: FlowStep): void => {
    setStep(next);

    if (next.kind === 'signed-in') onSignedIn?.();
  };

function useFlow({ signIn, reauthorize, onSignedIn }: FlowProps): Flow {
  const [step, setStep] = useState<SignInStep>({ kind: 'idle' });
  const [attempts] = useState(createAttempts);

  // A page that closes stops waiting; GitHub's code simply goes unused.
  useEffect(() => attempts.stop, [attempts]);

  const show = stepShower(setStep, onSignedIn);

  const start = (): void => {
    void signIn.start({ reauthorize, cancelled: attempts.begin(), show });
  };

  const cancel = (): void => {
    attempts.stop();
    setStep({ kind: 'idle' });
  };

  return { step, start, cancel };
}

// Drawn in place of a page whenever a borrow of the GitHub Account returns nothing (ADR-0036), and as the Account's own page.
export function SignIn({
  reauthorize = false,
  ...props
}: SignInProps): JSX.Element {
  const flow = useFlow({ ...props, reauthorize });

  return (
    <Screen title="GitHub">
      <SignInBody {...flow} reauthorize={reauthorize} />
    </Screen>
  );
}

type GateProps = {
  signIn: GitHubSignIn;
  need: SignInNeed;
  refresh: () => Promise<void>;
};

// Takes a page's place when its read needs the person to sign in, and reads again once they have.
export function SignInGate({ signIn, need, refresh }: GateProps): JSX.Element {
  return (
    <SignIn
      signIn={signIn}
      reauthorize={need.reauthorize}
      onSignedIn={() => void refresh()}
    />
  );
}
