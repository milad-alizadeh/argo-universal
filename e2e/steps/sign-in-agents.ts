// A sign-in fixture step names its Agent by ordinal.
const agentStep = (text: string): RegExp =>
  new RegExp(`^(?:Given|And) Agent (\\d+) ${text}$`);

const signInSteps = [
  [agentStep('needs sign-in'), 'sign-in-required'],
  [agentStep('offers two sign-in methods'), 'sign-in-methods'],
  [agentStep('holds its sign-in'), 'sign-in-held'],
  [agentStep('signs in through a terminal'), 'terminal-sign-in-required'],
  [agentStep('ends its first Turn needing sign-in'), 'turn-auth-required'],
  [
    agentStep('ends its first Turn needing a terminal sign-in'),
    'turn-terminal-sign-in',
  ],
  [agentStep('exits while opening its first Session'), 'open-exit-once'],
] as const;

type SignInScenario = (typeof signInSteps)[number][1];

// Sign-in and launch fixtures for the callouts above the Composer, as Agent ordinal and scenario.
export function signInScenarios(steps: string[]): [number, SignInScenario][] {
  return steps.flatMap((step) =>
    signInSteps.flatMap(([pattern, scenario]): [number, SignInScenario][] => {
      const match = pattern.exec(step);

      return match ? [[Number(match[1]), scenario]] : [];
    }),
  );
}
