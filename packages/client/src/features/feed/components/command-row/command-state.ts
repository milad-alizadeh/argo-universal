import {
  isToolCallRunning,
  type ToolCallTerminal,
  type ToolCallUpdate,
} from '@repo/contracts';

type ExitCode = NonNullable<ToolCallTerminal['exitStatus']>['exitCode'];

interface CommandFacts {
  row: ToolCallUpdate;
  exitCode: ExitCode | undefined;
  running: boolean;
  duration: string | undefined;
}

interface CommandStateInput {
  row: ToolCallUpdate;
  terminal: ToolCallTerminal;
  duration: string | undefined;
  awaitingApproval?: boolean;
}

export interface CommandFooterState {
  settled: boolean;
  failed: boolean;
  outcome: string;
}

export interface CommandState {
  disclosure: { failed: boolean; running: boolean; trailing?: string };
  footer: CommandFooterState;
}

const statusOutcomes = new Map<ToolCallUpdate['status'], string>([
  ['cancelled', 'Stopped'],
  ['failed', 'Failed'],
]);

const isFailed = ({ row, exitCode }: CommandFacts): boolean =>
  row.status === 'failed' || (exitCode !== undefined && exitCode !== 0);

const exitOutcome = ({
  exitCode,
  running,
}: CommandFacts): string | undefined =>
  exitCode !== undefined && !running ? `Exit ${exitCode}` : undefined;

const progressOutcome = (running: boolean): string =>
  running ? 'Running' : 'Completed';

const commandOutcome = (facts: CommandFacts): string =>
  exitOutcome(facts) ??
  statusOutcomes.get(facts.row.status) ??
  progressOutcome(facts.running);

const failureStatus = ({ exitCode, duration }: CommandFacts): string =>
  [exitCode === undefined ? 'failed' : `exit ${exitCode}`, duration]
    .filter(Boolean)
    .join(' · ');

const stoppedStatus = (duration?: string): string | undefined =>
  duration ? `after ${duration}` : duration;

function commandStatus(
  facts: CommandFacts,
  failed: boolean,
): string | undefined {
  if (failed) return failureStatus(facts);

  return facts.row.status === 'cancelled'
    ? stoppedStatus(facts.duration)
    : facts.duration;
}

const isSettled = ({ row, running }: CommandFacts): boolean =>
  !running && row.status !== 'cancelled';

const commandFacts = (input: CommandStateInput): CommandFacts => ({
  row: input.row,
  exitCode: input.terminal.exitStatus?.exitCode,
  running: isToolCallRunning(input.row),
  duration: input.duration,
});

export function commandState(input: CommandStateInput): CommandState {
  const facts = commandFacts(input);
  const failed = isFailed(facts);
  const status = commandStatus(facts, failed);
  const trailing = input.awaitingApproval ? undefined : status;

  return {
    disclosure: { failed, running: facts.running, trailing },
    footer: {
      settled: isSettled(facts),
      failed,
      outcome: commandOutcome(facts),
    },
  };
}

export function commandCode({ command, output }: ToolCallTerminal): string {
  const shown = output.replaceAll('\r\n', '\n').replace(/\n$/, '');

  return shown ? `$ ${command}\n${shown}` : `$ ${command}`;
}
