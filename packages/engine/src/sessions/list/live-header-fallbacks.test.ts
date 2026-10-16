import { describe, expect, it } from 'vitest';
import { liveHeaderMocks } from '#mocks/live-header';
import { headerText, running } from '#mocks/live-header-input';
import { toLiveHeader } from './live-header';

describe.each(liveHeaderMocks)(
  'live header for $agent',
  ({ command, thought, retry }): void => {
    it('uses supplied command actions without classifying shell text', (): void => {
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

      expect(headerText(toLiveHeader(running, [tool]))).toBe('Reading spec.md');
      expect(
        headerText(
          toLiveHeader(running, [
            {
              ...tool,
              _meta: undefined,
              content: [
                { type: 'terminal', command: 'cat spec.md', output: '' },
              ],
            },
          ]),
        ),
      ).toBe('Running cat spec.md');
    });
    it('ignores previous Turns, completed tools, and untitled thoughts', (): void => {
      expect(
        headerText(
          toLiveHeader(running, [
            { ...command, turnId: 'previous' },
            { ...command, status: 'completed' },
            {
              ...thought,
              content: [{ type: 'text', text: 'Thought without a title' }],
            },
          ]),
        ),
      ).toBe('Working');
      expect(
        headerText(
          toLiveHeader({ ...running, activeTurnId: null }, [
            command,
            thought,
            retry,
          ]),
        ),
      ).toBeNull();
    });
    it('clears a retry on new progress and uses the newest thought section without mutation', (): void => {
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
      expect(headerText(toLiveHeader(running, rows))).toBe('Second title');
      expect(rows).toEqual(original);
    });
  },
);
