import type { ServerAddress } from '#features/connection';
import { pairWithInvite } from './pair-with-invite';
import type { TypedDeps } from './pair-with-typed-code';
import {
  type Asked,
  Refused,
  type TypedOutcome,
  verdict,
} from './typed-verdict';

type Answered = Exclude<Asked, { kind: 'key' }> | { kind: 'key'; key: string };

// The key the Server at this address gives for the code, or why it did not: a refusal is its answer, and silence is only an address nobody answers on.
async function keyAt(
  at: ServerAddress,
  ticket: string,
  deps: TypedDeps,
): Promise<Answered> {
  try {
    return { kind: 'key', key: await deps.requestKey(at, ticket) };
  } catch (cause) {
    const refused = Refused.safeParse(cause);

    return refused.success
      ? { kind: 'refused', refusal: refused.data.refusal }
      : { kind: 'silent' };
  }
}

/*
 * Pairs with the Server at an address the owner typed, with no discovery (#1490 card 1b): the Server there is asked for its key with the code, and what follows is the scanned flow from the key onward, knocking at that address alone.
 * The Server's name is not known without a way to ask for it, so the address stands in for it until the Server is reached.
 */
export async function pairAtAddress(
  ticket: string,
  at: ServerAddress,
  deps: TypedDeps,
): Promise<TypedOutcome> {
  const answered = await keyAt(at, ticket, deps);

  if (answered.kind !== 'key') return verdict([answered]);
  const name = `${at.host}:${at.port}`;

  deps.onFound?.(name);

  return pairWithInvite(
    { key: answered.key, server: name, ticket },
    { ...deps, browse: null, address: at },
  );
}
