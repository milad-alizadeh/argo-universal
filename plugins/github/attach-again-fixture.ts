import { caller, type Journey } from './journey-fixture';

// What an Agent's `github.attach` with `again: true` does: it attaches a pull request detached from the Session.
export async function attachAgain(
  { test }: Journey,
  reference: string,
): Promise<void> {
  await test.operations.run({
    name: 'attach',
    params: { reference, again: true },
    caller,
  });
}
