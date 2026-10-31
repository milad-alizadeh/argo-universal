import { readControlToken } from '../src/server-runtime';

/*
 * What a plain-HTTP request shows to prove it is the Server Device's, the way the `argo` CLI and an Agent do: the user token from the Server's own runtime folder (ADR-0044).
 * A test that stands in for a web page sends none of this, since a page cannot read the file.
 */
export const userTokenHeaders = async (
  home: string,
): Promise<{ authorization: string }> => ({
  authorization: `Bearer ${await userToken(home)}`,
});

// The token itself, for a caller that sends it in a WebSocket's connection parameters rather than a header.
export const userToken = (home: string): Promise<string> =>
  readControlToken(home);
