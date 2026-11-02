import { expect, it } from 'vitest';
import { userToken } from '#mocks/engine-proof';
import { askOverSocket, home } from '#mocks/engine-request';

/*
 * A WebSocket carries the same two proofs, and a browser's upgrade from a page elsewhere never gets this far (ADR-0045).
 * The upgrade itself admits nobody: a caller with no page of its own, such as the desktop App's main process or the `argo` CLI, shows the token in the Connection's parameters, and one that shows neither reaches no procedure (#1696).
 */
it('serves no procedure on a WebSocket that shows neither an Origin nor a token', async (): Promise<void> => {
  await expect(askOverSocket({})).resolves.toBe(
    'This Connection has not proved which Device it is',
  );
});

// A Connection is refused by the procedure it called, which is where a subscription's caller hears it; the plain-HTTP door is the one that names the token, because that is where the CLI asks.
it('serves no procedure on a WebSocket that shows a token the Server does not know', async (): Promise<void> => {
  await expect(askOverSocket({ token: 'wrong' })).resolves.toBe(
    'This Connection has not proved which Device it is',
  );
});

it('serves a WebSocket that shows the user token', async (): Promise<void> => {
  await expect(askOverSocket({ token: await userToken(home) })).resolves.toBe(
    '1.2.3',
  );
});

it("serves a WebSocket opened by the App's own page", async (): Promise<void> => {
  await expect(
    askOverSocket({ headers: { origin: 'app://app' } }),
  ).resolves.toBe('1.2.3');
});
