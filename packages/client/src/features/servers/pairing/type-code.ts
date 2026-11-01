import { requestServerKey } from '#features/connection';
import { depsOf, type Hook, settle } from './pair-hook';
import { pairWithTypedCode, type TypedDeps } from './pair-with-typed-code';

/*
 * Pairs with the Server a typed code belongs to (#1502). The page is the entry while the Servers on the network are asked, then the wait on the owner once one has said the code is its own.
 * What the owner typed goes out as typed: whether it can be a code is the pairing's to say, so every mistake is told the same way and the entry stays.
 */
export function typeCode(typed: string, hook: Hook): void {
  if (hook.held.running) return;

  const controller = new AbortController();
  hook.held.running = controller;
  hook.held.lastTyped = typed;
  hook.setState({ phase: 'looking' });
  void run(typed, controller, hook);
}

// What asks the Servers, and reports the one that knew the code as soon as it does so the page can name it.
const typedDepsOf = (
  controller: AbortController,
  hook: Hook,
  found: { name: string },
): TypedDeps => ({
  ...depsOf(controller.signal),
  requestKey: requestServerKey,
  onFound: (name) => {
    found.name = name;

    if (!controller.signal.aborted)
      hook.setState({ phase: 'waiting', serverName: name });
  },
});

async function run(
  typed: string,
  controller: AbortController,
  hook: Hook,
): Promise<void> {
  const found = { name: '' };

  const outcome = await pairWithTypedCode(
    typed,
    typedDepsOf(controller, hook, found),
  );

  if (controller.signal.aborted) return;
  hook.held.running = null;
  settle(outcome, hook, { serverName: found.name, typed: true });
}
