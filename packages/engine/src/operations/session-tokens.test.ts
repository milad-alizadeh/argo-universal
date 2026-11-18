import { expect, it } from 'vitest';
import { SessionTokens } from './session-tokens';

const graceMs = 1000;

type TokensOnClock = { tokens: SessionTokens; advance: (ms: number) => void };

// A clock the test moves, so the grace runs out when the test says.
function tokensAt(): TokensOnClock {
  let now = 0;

  return {
    tokens: new SessionTokens({ now: () => now, argoToolsGraceMs: graceMs }),
    advance: (ms) => {
      now += ms;
    },
  };
}

it('waits for `argo mcp` within the grace, then calls it missing', () => {
  const { tokens, advance } = tokensAt();
  const grant = tokens.issue('session-1', 'project-1');

  expect(grant.argoTools()).toBe('waiting');
  advance(graceMs);
  expect(grant.argoTools()).toBe('missing');
});

it('knows a Session loaded Argo tools once `argo mcp` reads its instructions with its token', () => {
  const { tokens, advance } = tokensAt();
  const grant = tokens.issue('session-1', 'project-1');

  advance(graceMs);
  tokens.recordToolsLoaded(grant.token);
  expect(grant.argoTools()).toBe('loaded');
});

it('records nothing for a token no live Session holds', () => {
  const { tokens } = tokensAt();
  const grant = tokens.issue('session-1', 'project-1');

  tokens.recordToolsLoaded('another-token');
  expect(grant.argoTools()).toBe('waiting');
});

it('forgets the tools of a released token', () => {
  const { tokens, advance } = tokensAt();
  const grant = tokens.issue('session-1', 'project-1');

  tokens.recordToolsLoaded(grant.token);
  grant.release();
  advance(graceMs);
  expect(grant.argoTools()).toBe('missing');
});
