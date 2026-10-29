import type {
  CommandAction,
  Notice,
  PermissionOutcome,
  ToolCallUpdate,
  TurnEnd,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { commandRow, workMocks } from '../../../../mocks/feed-view.mocks';
import { noticeTurnEnd, toolCallFacts } from './feed-row-facts';

const [mock] = workMocks;

if (!mock) throw new Error('Recording needs work');

const base = commandRow(mock.rows);

const call = (changes: Partial<ToolCallUpdate>): ToolCallUpdate => ({
  ...base,
  _meta: undefined,
  locations: undefined,
  content: [],
  ...changes,
});

const withActions = (actions: CommandAction[]): ToolCallUpdate =>
  call({ _meta: { argo: { commandActions: actions } } });

const fromLocation = 'from-location.ts';

const read = (path?: string): CommandAction => ({
  type: 'read',
  command: 'opaque',
  ...(path && { path }),
});

describe('toolCallFacts exploration', () => {
  it('is what the Agent reported', () => {
    const actions: CommandAction[] = [
      read('a.ts'),
      { type: 'list', command: 'ls', path: 'src' },
    ];

    expect(toolCallFacts(withActions(actions)).exploration).toEqual(actions);
  });

  it('is nothing when any reported action is unknown', () => {
    const unknown: CommandAction = { type: 'unknown', command: 'make' };

    expect(
      toolCallFacts(withActions([read('a.ts'), unknown])).exploration,
    ).toEqual([]);
  });

  it.each(['read', 'search'] as const)(
    'implies one %s action from the kind and first location',
    (kind) => {
      const row = call({ kind, locations: [{ path: 'a.ts' }, { path: 'b' }] });

      expect(toolCallFacts(row).exploration).toEqual([
        { type: kind, command: '', path: 'a.ts' },
      ]);
    },
  );

  it('is nothing for a plain command', () => {
    expect(toolCallFacts(call({ kind: 'execute' })).exploration).toEqual([]);
  });
});

describe('toolCallFacts edited paths', () => {
  it('is null for a call that is not an edit', () => {
    expect(toolCallFacts(call({ kind: 'execute' })).editedPaths).toBeNull();
  });

  it.each(['edit', 'delete', 'move'] as const)(
    'collects the locations and diff paths of a %s',
    (kind) => {
      const row = call({
        kind,
        locations: [{ path: 'a.ts' }],
        content: [
          {
            type: 'diff',
            changes: [
              { operation: 'modify', path: 'a.ts' },
              { operation: 'add', path: 'b.ts' },
            ],
          },
        ],
      });

      expect(toolCallFacts(row).editedPaths).toEqual(new Set(['a.ts', 'b.ts']));
    },
  );

  it('is an empty set for an edit that names no file', () => {
    expect(toolCallFacts(call({ kind: 'edit' })).editedPaths).toEqual(
      new Set(),
    );
  });
});

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
