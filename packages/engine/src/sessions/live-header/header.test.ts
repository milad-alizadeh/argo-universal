import { permissionOptions } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { liveHeaderMocks } from '#mocks/live-header';
import { headerText, running } from '#mocks/live-header-input';
import { toLiveHeader } from './header';

describe.each(liveHeaderMocks)(
  'live header for $agent',
  ({ command, thought, retry, recordedHeader }): void => {
    it('uses the recorded Agent description or supplied command action', (): void => {
      expect(toLiveHeader(running, [command])).toEqual({
        text: recordedHeader,
        source: { type: 'tool_call', toolCallId: command.toolCallId },
        startedAt: 1_000,
      });
    });
    it('names the step that produced the text', (): void => {
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
    it('puts a Permission request before running work', (): void => {
      expect(
        headerText(
          toLiveHeader(
            {
              ...running,
              permissionQueue: [
                {
                  requestId: 'request-1',
                  toolCallId: command.toolCallId,
                  title: 'Allow command?',
                  options: permissionOptions,
                },
              ],
            },
            [command],
          ),
        ),
      ).toBe('Awaiting approval');
    });
    it.each([
      {
        step: 'Elicitation',
        session: {
          ...running,
          elicitationQueue: [
            {
              requestId: 'request-1',
              mode: 'form' as const,
              message: 'Which file?',
              requestedSchema: { properties: {} },
            },
          ],
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
    ])('step 1: $step', ({ session, expected }): void => {
      expect(headerText(toLiveHeader(session, [command, thought, retry]))).toBe(
        expected,
      );
    });
    it('step 2: puts a retry before a thought and a Tool call', (): void => {
      expect(headerText(toLiveHeader(running, [command, thought, retry]))).toBe(
        'Retrying (2 of 5)',
      );
    });
    it('step 3: uses the newest thought title before the Tool call', (): void => {
      expect(headerText(toLiveHeader(running, [thought, command]))).toBe(
        'Checking the tests',
      );
    });
    it('step 4: keeps the Agent description before the kind label', (): void => {
      expect(
        headerText(
          toLiveHeader(running, [
            {
              ...command,
              title: 'Generated command title',
              _meta: { argo: { description: 'Check the whole suite' } },
            },
          ]),
        ),
      ).toBe('Check the whole suite');
    });
  },
);
