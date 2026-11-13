import { needsSignIn } from './pull-reads';

// Why a read failed, and whether signing in would mend it.
export type Failure = { reason: 'signIn' | 'failed'; message: string };

// What Argo keeps for one named read: the last good answer, and why the latest read failed, either or both.
export type Known<Value> = { data?: Value; failure?: Failure };

type State<Value> = { data?: Value; error?: string };

export const noAnswer = 'GitHub gave no answer.';

const failureOf = (message: string): Failure => ({
  reason: needsSignIn(message) ? 'signIn' : 'failed',
  message,
});

const messageOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const withData = <Value>(data: Value | undefined): { data?: Value } =>
  data === undefined ? {} : { data };

const withFailure = (error: string | undefined): { failure?: Failure } =>
  error === undefined ? {} : { failure: failureOf(error) };

const knownOf = <Value>({ data, error }: State<Value>): Known<Value> => ({
  ...withData(data),
  ...withFailure(error),
});

// A read that cannot even be made is a failure of this read alone, never of its neighbours.
export async function known<Value>(
  read: () => Promise<State<Value>>,
): Promise<Known<Value>> {
  try {
    return knownOf(await read());
  } catch (cause) {
    return { failure: failureOf(messageOf(cause)) };
  }
}

// Why a read has no answer.
export const failureMessage = ({ failure }: Known<unknown>): string =>
  failure?.message ?? noAnswer;
