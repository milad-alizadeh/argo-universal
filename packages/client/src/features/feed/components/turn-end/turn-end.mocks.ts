import type { TurnEnd } from '@repo/contracts';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import type { FeedTurnEnd } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';

const recording = recordedAcpContent('agent-1');

const source = recording.rows.find((row) => row.sessionUpdate === 'notice');

if (!source) throw new Error('Recorded ACP content needs a Notice');

export const stoppedTurn: FeedTurnEnd = {
  type: 'turn_end',
  row: source,
  end: { stopReason: 'cancelled', error: null, durationMs: 80_000 },
};

export const turnEndItems = (
  end: TurnEnd,
): ReturnType<typeof toFeedView>['items'] =>
  toFeedView(
    [{ ...stoppedTurn.row, _meta: { argo: { turnEnd: end } } }],
    recording.snapshot,
  ).items;

export const endings = {
  stopped: stoppedTurn.end,
  outputLimit: { ...stoppedTurn.end, stopReason: 'max_tokens' },
  stepLimit: { ...stoppedTurn.end, stopReason: 'max_turn_requests' },
  refused: { ...stoppedTurn.end, stopReason: 'refusal' },
  error: {
    ...stoppedTurn.end,
    stopReason: 'error',
    error: { code: -32603, message: 'The model request failed' },
  },
  errorWithoutDetails: { ...stoppedTurn.end, stopReason: 'error' },
  authenticationRequired: { ...stoppedTurn.end, stopReason: 'auth_required' },
  completed: { ...stoppedTurn.end, stopReason: 'end_turn' },
  interrupted: {
    ...stoppedTurn.end,
    stopReason: 'error',
    error: { code: 'interrupted', message: 'Agent exited with status 1' },
  },
} satisfies Record<string, TurnEnd>;

export const visibleEndings = [
  { label: 'Stopped', end: endings.stopped },
  { label: 'Output limit', end: endings.outputLimit },
  { label: 'Step limit', end: endings.stepLimit },
  { label: 'Refused', end: endings.refused },
  { label: 'Error', end: endings.error },
  { label: 'Error without details', end: endings.errorWithoutDetails },
  { label: 'Authentication required', end: endings.authenticationRequired },
];
