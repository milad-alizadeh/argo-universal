import type { PinnedOption } from './real-agent-choice.mts';

/*
 * Whether a real-Agent perf run is pinned to the options it was asked to pin, before it prompts.
 *
 * An adapter opens a Session at its own default model and effort, a perf run sends several prompts,
 * and the frame timings it measures do not depend on the model at all. So the pin is applied
 * through `session.setConfigOption` and then read back from the Session's own options: the request
 * succeeding is not evidence the Agent took it. A run whose read-back disagrees fails here rather
 * than falling back to the default quietly.
 */

// A Session option as the Agent reports it back, which is all this check reads.
export interface ReportedOption {
  configId: string;
  currentValue: string | boolean;
}

const reported = (
  options: readonly ReportedOption[],
  configId: string,
): ReportedOption | undefined =>
  options.find((option) => option.configId === configId);

const describeValue = (option: ReportedOption | undefined): string =>
  option === undefined ? 'not reported' : JSON.stringify(option.currentValue);

const unpinned = (
  pin: readonly PinnedOption[],
  options: readonly ReportedOption[],
): string[] =>
  pin.flatMap(({ configId, value }) => {
    const option = reported(options, configId);

    return option?.currentValue === value
      ? []
      : [
          `${configId} is ${describeValue(option)}, not ${JSON.stringify(value)}`,
        ];
  });

// Why this run must not prompt, or undefined when every pinned option reads back as asked.
export function costPinFailure(
  pin: readonly PinnedOption[],
  options: readonly ReportedOption[],
): string | undefined {
  const failures = unpinned(pin, options);

  if (!failures.length) return undefined;

  return [
    'This real-Agent perf run is not pinned to the options it was asked to pin, so it will not prompt:',
    ...failures.map((failure) => `  ${failure}`),
    'The run bills the owner, and the frame timings it measures do not depend on the model.',
  ].join('\n');
}
