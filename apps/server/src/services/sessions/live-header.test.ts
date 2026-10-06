import { describe, expect, it } from 'vitest';
import { liveHeaderMocks } from '#mocks/live-header';
import { type LiveHeaderInput, toLiveHeader } from './live-header';

const headerText = (...input: Parameters<typeof toLiveHeader>) =>
  toLiveHeader(...input)?.text ?? null;

const running: LiveHeaderInput = {
  activeTurnId: 'turn-1',
  activeTurnStartedAt: 1_000,
  permissionQueue: [],
  pendingElicitation: null,
};

describe.each(liveHeaderMocks)(
  'live header for $agent',
  ({ command, thought, retry, recordedHeader }) => {
    it('uses the recorded Agent description or supplied command action', () => {
      expect(toLiveHeader(running, [command])).toEqual({
        text: recordedHeader,
        source: { type: 'tool_call', toolCallId: command.toolCallId },
        startedAt: 1_000,
      });
    });
    it('names the step that produced the text', () => {
      expect(toLiveHeader(running, [command, thought, retry])?.source).toEqual({
        type: 'retry',
      });
      expect(toLiveHeader(running, [command, thought])?.source).toEqual({
        type: 'thought',
      });
      expect(toLiveHeader(running, [])).toEqual({
        text: 'Working',
        source: { type: 'working' },
        startedAt: 1_000,
      });
      expect(
        toLiveHeader(
          {
            ...running,
            activeTurnId: null,
            activeTurnStartedAt: null,
            pendingPlanProposal: { planId: 'plan-1', content: 'A plan' },
          },
          [],
        ),
      ).toEqual({
        text: 'Plan ready',
        source: { type: 'request' },
        startedAt: null,
      });
    });
    it('puts a Permission request before running work', () => {
      expect(
        headerText(
          {
            ...running,
            permissionQueue: [
              {
                toolCallId: command.toolCallId,
                title: 'Allow command?',
                options: [],
              },
            ],
          },
          [command],
        ),
      ).toBe('Awaiting approval');
    });
    it.each([
      {
        step: 'Elicitation',
        session: {
          ...running,
          pendingElicitation: {
            mode: 'form' as const,
            message: 'Which file?',
            requestedSchema: { properties: {} },
          },
        },
        expected: 'Waiting for your answer',
      },
      {
        step: 'Plan proposal',
        session: {
          ...running,
          activeTurnId: null,
          pendingPlanProposal: { planId: 'plan-1', content: 'A plan' },
        },
        expected: 'Plan ready',
      },
    ])('step 1: $step', ({ session, expected }) => {
      expect(headerText(session, [command, thought, retry])).toBe(expected);
    });
    it('step 2: puts a retry before a thought and a Tool call', () => {
      expect(headerText(running, [command, thought, retry])).toBe(
        'Retrying (2 of 5)',
      );
    });
    it('step 3: uses the newest thought title before the Tool call', () => {
      expect(headerText(running, [thought, command])).toBe(
        'Checking the tests',
      );
    });
    it('step 4: keeps the Agent description before the kind label', () => {
      expect(
        headerText(running, [
          {
            ...command,
            title: 'Generated command title',
            _meta: { argo: { description: 'Check the whole suite' } },
          },
        ]),
      ).toBe('Check the whole suite');
    });
    it.each([
      { kind: 'execute' as const, expected: 'Running pnpm test' },
      { kind: 'read' as const, expected: 'Reading spec.md' },
      { kind: 'edit' as const, expected: 'Editing spec.md' },
    ])('step 5: uses the $kind label', ({ kind, expected }) => {
      expect(
        headerText(running, [
          {
            ...command,
            title: '',
            kind,
            locations: [{ path: 'spec.md' }],
            content: [{ type: 'terminal', command: 'pnpm test', output: '' }],
            _meta: undefined,
          },
        ]),
      ).toBe(expected);
    });
    it('step 6: uses the Tool call name when no kind label applies', () => {
      expect(
        headerText(running, [
          {
            ...command,
            kind: 'other',
            title: '',
            name: 'workspace.inspect',
            _meta: undefined,
          },
        ]),
      ).toBe('workspace.inspect');
    });
    it('step 7: falls back to Working', () => {
      expect(headerText(running, [])).toBe('Working');
      expect(
        headerText(running, [
          {
            ...command,
            kind: 'other',
            name: undefined,
            title: '',
            _meta: undefined,
          },
        ]),
      ).toBe('Working');
    });
    it('uses supplied command actions without classifying shell text', () => {
      const tool = {
        ...command,
        title: 'Read spec.md',
        _meta: {
          argo: {
            commandActions: [
              {
                type: 'read' as const,
                path: 'spec.md',
                command: 'cat spec.md',
              },
            ],
          },
        },
      };
      expect(headerText(running, [tool])).toBe('Reading spec.md');
      expect(
        headerText(running, [
          {
            ...tool,
            _meta: undefined,
            content: [{ type: 'terminal', command: 'cat spec.md', output: '' }],
          },
        ]),
      ).toBe('Running cat spec.md');
    });
    it('ignores previous Turns, completed tools, and untitled thoughts', () => {
      expect(
        headerText(running, [
          { ...command, turnId: 'previous' },
          { ...command, status: 'completed' },
          {
            ...thought,
            content: [{ type: 'text', text: 'Thought without a title' }],
          },
        ]),
      ).toBe('Working');
      expect(
        headerText({ ...running, activeTurnId: null }, [
          command,
          thought,
          retry,
        ]),
      ).toBeNull();
    });
    it('clears a retry on new progress and uses the newest thought section without mutation', () => {
      const newest = {
        ...thought,
        revision: retry.revision + 1,
        content: [
          {
            type: 'text' as const,
            text: '**First title**\n\nDetails\n\n**Second title**\n\nMore details',
          },
        ],
      };
      const rows = [retry, command, newest];
      const original = structuredClone(rows);
      expect(headerText(running, rows)).toBe('Second title');
      expect(rows).toEqual(original);
    });
  },
);
