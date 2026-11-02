import { describe, expect, it } from 'vitest';
import { liveHeaderMocks } from '#mocks/live-header';
import { headerText, running } from '#mocks/live-header-input';
import { toLiveHeader } from './header';

describe.each(liveHeaderMocks)(
  'live header for $agent',
  ({ command, recordedHeader }): void => {
    it.each([
      { kind: 'execute' as const, expected: 'Running pnpm test' },
      { kind: 'read' as const, expected: 'Reading spec.md' },
      { kind: 'edit' as const, expected: 'Editing spec.md' },
    ])('step 5: uses the $kind label', ({ kind, expected }): void => {
      expect(
        headerText(
          toLiveHeader(running, [
            {
              ...command,
              title: '',
              kind,
              locations: [{ path: 'spec.md' }],
              content: [{ type: 'terminal', command: 'pnpm test', output: '' }],
              _meta: undefined,
            },
          ]),
        ),
      ).toBe(expected);
    });
    it.each(['search' as const, 'fetch' as const, 'other' as const])(
      'step 6: uses the Tool call title for a %s Tool call without a kind label',
      (kind): void => {
        expect(
          headerText(
            toLiveHeader(running, [
              {
                ...command,
                kind,
                title: 'github: list_issues',
                name: 'list_issues',
                content: [],
                _meta: undefined,
              },
            ]),
          ),
        ).toBe('github: list_issues');
      },
    );
    it('step 6: uses the Tool call name when no kind label applies', (): void => {
      expect(
        headerText(
          toLiveHeader(running, [
            {
              ...command,
              kind: 'other',
              title: '',
              name: 'workspace.inspect',
              _meta: undefined,
            },
          ]),
        ),
      ).toBe('workspace.inspect');
    });
    it('step 7: falls back to Working', (): void => {
      expect(headerText(toLiveHeader(running, []))).toBe('Working');
      expect(
        headerText(
          toLiveHeader(running, [
            {
              ...command,
              kind: 'other',
              name: undefined,
              title: '',
              _meta: undefined,
            },
          ]),
        ),
      ).toBe('Working');
    });
    it.each([
      { status: 'in_progress' as const, expected: 'Checking second file' },
      { status: 'completed' as const, expected: recordedHeader },
    ])(
      'falls back to the earlier running Tool call when the newer is $status',
      ({ status, expected }): void => {
        expect(
          headerText(
            toLiveHeader(running, [
              command,
              {
                ...command,
                id: 'newer-tool',
                toolCallId: 'newer-tool',
                position: command.position + 1,
                revision: command.revision + 1,
                status,
                _meta: { argo: { description: 'Checking second file' } },
              },
            ]),
          ),
        ).toBe(expected);
      },
    );
  },
);
