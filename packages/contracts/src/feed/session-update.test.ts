import { describe, expect, expectTypeOf, it } from 'vitest';
import { SessionUpdate, SessionUpdateKind } from './session-update';

const envelope = {
  id: 'row-1',
  sessionId: 'session-1',
  position: 3,
  revision: 7,
  turnId: 'turn-1',
  state: 'settled',
} as const;

const blobId = 'a'.repeat(64);

// One valid payload and one broken payload for each Session update kind.
const samples = {
  user_message: {
    valid: {
      messageId: 'message-1',
      content: [
        { type: 'text', text: '/review main' },
        {
          type: 'image',
          mimeType: 'image/png',
          blob: { blobId, mime: 'image/png', bytes: 120, width: 4, height: 3 },
          _meta: { argo: { source: 'pasted' } },
        },
        {
          type: 'resource_link',
          name: 'notes.md',
          uri: 'file:///notes.md',
          _meta: { argo: { source: 'upload' } },
        },
        {
          type: 'resource',
          resource: {
            uri: 'file:///a.ts',
            text: 'export {};',
            mimeType: 'text/typescript',
          },
        },
      ],
    },
    invalid: {
      messageId: 'message-1',
      content: [{ type: 'image', mimeType: 'image/png', data: 'base64' }],
    },
  },
  agent_message: {
    valid: {
      messageId: 'message-2',
      content: [{ type: 'text', text: 'Done.' }],
    },
    invalid: { messageId: 'message-2', content: 'Done.' },
  },
  agent_thought: {
    valid: {
      messageId: 'message-3',
      content: [{ type: 'text', text: 'Read the tests first.' }],
    },
    invalid: { content: [{ type: 'text', text: 'No message id.' }] },
  },
  tool_call_update: {
    valid: {
      toolCallId: 'tool-1',
      title: 'Edit src/a.ts',
      name: 'Edit',
      kind: 'edit',
      status: 'completed',
      content: [
        { type: 'content', content: { type: 'text', text: 'ok' } },
        {
          type: 'diff',
          changes: [
            {
              operation: 'move',
              path: '/repo/b.ts',
              oldPath: '/repo/a.ts',
              oldText: 'a',
              newText: 'b',
            },
          ],
          patch: { format: 'git_patch', text: 'diff --git a/a.ts b/b.ts' },
        },
        {
          type: 'terminal',
          command: 'pnpm test',
          cwd: '/repo',
          output: 'passed',
          exitStatus: { exitCode: 0 },
        },
      ],
      locations: [{ path: '/repo/b.ts', line: 1 }],
      rawInput: { file_path: '/repo/a.ts' },
      rawOutput: 'ok',
      _meta: {
        argo: {
          truncated: true,
          permissionOutcome: { outcome: 'selected', optionId: 'allow' },
        },
      },
    },
    invalid: {
      toolCallId: 'tool-1',
      title: 'Run',
      kind: 'shell',
      status: 'completed',
      content: [],
    },
  },
  plan_update: {
    valid: {
      plan: {
        type: 'items',
        planId: 'plan-1',
        entries: [
          {
            content: 'Write tests',
            priority: 'high',
            status: 'in_progress',
            _meta: { argo: { activeForm: 'Writing tests' } },
          },
        ],
      },
    },
    invalid: { plan: { type: 'file', planId: 'plan-1', path: '/plan.md' } },
  },
  compaction_update: {
    valid: {
      compactionId: 'compaction-1',
      status: 'completed',
      summary: [{ type: 'text', text: 'Summary' }],
    },
    invalid: { compactionId: 'compaction-1', status: 'done' },
  },
  subagent_update: {
    valid: {
      subagentSessionId: 'session-2',
      title: 'Explore',
      state: 'running',
    },
    invalid: { subagentSessionId: 'session-2', state: 'unknown' },
  },
  notice: {
    valid: {
      severity: 'warning',
      title: 'Retrying',
      description: 'Rate limited',
      _meta: {
        argo: {
          retry: { attempt: 1, maxAttempts: 3, delayMs: 500 },
          unrecognised: { excerpt: '{"type":"x"}' },
        },
      },
    },
    invalid: { severity: 'debug', title: 'Retrying' },
  },
  task_update: {
    valid: { taskId: 'task-1', status: 'running', title: 'pnpm dev' },
    invalid: { taskId: 'task-1', status: 'running' },
  },
} satisfies Record<SessionUpdateKind, { valid: object; invalid: object }>;

describe('SessionUpdate', () => {
  for (const kind of SessionUpdateKind.options) {
    it(`parses a valid ${kind}`, () => {
      const row = { ...envelope, sessionUpdate: kind, ...samples[kind].valid };
      expect(SessionUpdate.parse(row)).toEqual(row);
    });

    it(`rejects a broken ${kind}`, () => {
      const row = {
        ...envelope,
        sessionUpdate: kind,
        ...samples[kind].invalid,
      };
      expect(SessionUpdate.safeParse(row).success).toBe(false);
    });
  }

  it('rejects an unknown sessionUpdate kind', () => {
    const result = SessionUpdate.safeParse({
      ...envelope,
      sessionUpdate: 'state_update',
      state: 'idle',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe('invalid_union');
  });

  it('rejects an unknown key instead of dropping it', () => {
    const row = {
      ...envelope,
      sessionUpdate: 'agent_message',
      ...samples.agent_message.valid,
      extra: true,
    };
    expect(SessionUpdate.safeParse(row).success).toBe(false);
  });

  it('rejects an unknown key in _meta.argo', () => {
    const row = {
      ...envelope,
      sessionUpdate: 'task_update',
      ...samples.task_update.valid,
      _meta: { argo: { source: 'upload' } },
    };
    expect(SessionUpdate.safeParse(row).success).toBe(false);
  });

  it('rejects a broken envelope', () => {
    const row = {
      ...envelope,
      position: -1,
      sessionUpdate: 'task_update',
      ...samples.task_update.valid,
    };
    expect(SessionUpdate.safeParse(row).success).toBe(false);
    const { turnId: _turnId, ...withoutTurnId } = {
      ...envelope,
      sessionUpdate: 'task_update',
      ...samples.task_update.valid,
    };
    expect(SessionUpdate.safeParse(withoutTurnId).success).toBe(false);
  });

  it('round-trips the envelope through JSON', () => {
    for (const kind of SessionUpdateKind.options) {
      const row = SessionUpdate.parse({
        ...envelope,
        turnId: null,
        state: 'open',
        sessionUpdate: kind,
        ...samples[kind].valid,
      });
      expect(SessionUpdate.parse(JSON.parse(JSON.stringify(row)))).toEqual(row);
    }
  });

  it('lists exactly the kinds of the union', () => {
    expectTypeOf<SessionUpdateKind>().toEqualTypeOf<
      SessionUpdate['sessionUpdate']
    >();
    expect(
      SessionUpdate.options.map((option) => option.shape.sessionUpdate.value),
    ).toEqual(SessionUpdateKind.options);
  });
});
