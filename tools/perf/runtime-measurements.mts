import type {
  RuntimeTrial,
  RuntimeMilestone,
  RuntimeObservation,
} from './runtime-types.mts';

function timestamp(
  events: RuntimeObservation[],
  name: RuntimeMilestone,
): number | undefined {
  return events.find((event) => event.milestone === name)?.atMs;
}

function interval(
  events: RuntimeObservation[],
  start: RuntimeMilestone,
  end: RuntimeMilestone,
): number | null {
  const first = timestamp(events, start);
  const last = timestamp(events, end);

  if (first === undefined || last === undefined) return null;

  return last - first;
}

export function runtimeMeasurements(
  events: RuntimeObservation[],
): RuntimeTrial['measurements'] {
  const elapsed = (end: RuntimeMilestone): number | null =>
    interval(events, 'dispatched', end);

  return {
    acceptanceMs: elapsed('accepted'),
    firstAgentContentMs: elapsed('first-agent-content'),
    turnMs: elapsed('turn-ended'),
    finalSentinelMs: elapsed('sentinel-received'),
    ...toolDispatchMeasurements(events),
    ...cancellationMeasurements(events),
    ...toolMeasurements(events),
  };
}

function cancellationMeasurements(
  events: RuntimeObservation[],
): Pick<
  RuntimeTrial['measurements'],
  'cancelAcknowledgementMs' | 'cancelTerminalMs'
> {
  const start = 'cancel-dispatched';
  const acknowledgement = interval(events, start, 'cancel-acknowledged');

  return {
    cancelAcknowledgementMs: acknowledgement,
    cancelTerminalMs: interval(events, 'cancel-dispatched', 'turn-ended'),
  };
}

function toolMeasurements(
  events: RuntimeObservation[],
): RuntimeTrial['measurements'] {
  const start = 'tool-received';

  return {
    toolReceiptToFirstOutputMs: interval(events, start, 'first-tool-output'),
    toolReceiptToCompletionMs: interval(events, start, 'tool-completed'),
  };
}

function toolDispatchMeasurements(
  events: RuntimeObservation[],
): RuntimeTrial['measurements'] {
  const elapsed = (end: RuntimeMilestone): number | null =>
    interval(events, 'dispatched', end);

  return {
    toolReceivedMs: elapsed('tool-received'),
    firstToolOutputMs: elapsed('first-tool-output'),
    toolCompletedMs: elapsed('tool-completed'),
  };
}
