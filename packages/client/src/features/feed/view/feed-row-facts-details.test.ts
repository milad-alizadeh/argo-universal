import type { Notice, PermissionOutcome, TurnEnd } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { noticeTurnEnd, toolCallFacts } from './feed-row-facts';
import { base, call, fromLocation, read } from './feed-row-facts.mocks';

describe('toolCallFacts path', () => {
  it('prefers the first reported action path to the first location', () => {
    const row = call({
      _meta: {
        argo: { commandActions: [read(), read('from-action.ts')] },
      },
      locations: [{ path: fromLocation }],
    });

    expect(toolCallFacts(row).path).toBe('from-action.ts');
  });

  it('falls back to the first location', () => {
    const row = call({ locations: [{ path: fromLocation }] });

    expect(toolCallFacts(row).path).toBe(fromLocation);
  });

  it('names the first location', () => {
    const row = call({ locations: [{ path: fromLocation }, { path: 'b.ts' }] });

    expect(toolCallFacts(row).location).toBe(fromLocation);
  });

  it('is undefined without either', () => {
    expect(toolCallFacts(call({})).path).toBeUndefined();
  });
});

describe('toolCallFacts permission outcome', () => {
  const outcome: PermissionOutcome = {
    outcome: 'selected',
    optionId: 'allow_once',
    name: 'Allow',
    kind: 'allow_once',
  };

  it('carries how the user answered', () => {
    const row = call({ _meta: { argo: { permissionOutcome: outcome } } });

    expect(toolCallFacts(row).permissionOutcome).toEqual(outcome);
  });

  it('is undefined while unanswered', () => {
    expect(toolCallFacts(call({})).permissionOutcome).toBeUndefined();
  });
});

const notice = (_meta?: Notice['_meta']): Notice => ({
  id: 'notice',
  sessionId: base.sessionId,
  turnId: base.turnId,
  position: base.position,
  revision: base.revision,
  state: 'settled',
  sessionUpdate: 'notice',
  severity: 'info',
  title: 'Turn ended',
  _meta,
});

describe('noticeTurnEnd', () => {
  it('reads how the Turn ended', () => {
    const end: TurnEnd = {
      stopReason: 'end_turn',
      error: null,
      durationMs: 5,
    };

    expect(noticeTurnEnd(notice({ argo: { turnEnd: end } }))).toEqual(end);
  });

  it('is undefined for a Notice that ends no Turn', () => {
    expect(noticeTurnEnd(notice())).toBeUndefined();
  });
});
