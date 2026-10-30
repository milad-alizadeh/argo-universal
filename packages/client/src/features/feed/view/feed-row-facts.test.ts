import type { CommandAction } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { toolCallFacts } from './feed-row-facts';
import { call, read, withActions } from './feed-row-facts.mocks';

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
  it('is empty for a call that is not an edit', () => {
    const facts = toolCallFacts(call({ kind: 'execute' }));

    expect(facts.isEdit).toBe(false);
    expect(facts.editedPaths).toEqual(new Set());
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

describe('toolCallFacts command', () => {
  it('is a command only for an execute call', () => {
    expect(toolCallFacts(call({ kind: 'execute' })).isCommand).toBe(true);
    expect(toolCallFacts(call({ kind: 'read' })).isCommand).toBe(false);
  });

  it('keeps the reported actions only when all are classified', () => {
    const unknown: CommandAction = { type: 'unknown', command: 'make' };

    expect(toolCallFacts(withActions([read('a.ts')])).actions).toEqual([
      read('a.ts'),
    ]);
    expect(toolCallFacts(withActions([read('a.ts'), unknown])).actions).toEqual(
      [],
    );
  });

  it('still names the file of an unclassified action', () => {
    const unknown: CommandAction = {
      type: 'unknown',
      command: 'make',
      path: 'a.ts',
    };

    expect(toolCallFacts(withActions([unknown])).path).toBe('a.ts');
  });
});
