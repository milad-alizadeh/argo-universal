import { randomUUID } from 'node:crypto';
import type { RuntimeCase, RuntimeOptions } from './runtime-options.mts';
import type { RuntimeWorkload } from './runtime-types.mts';

interface Command {
  shell: string;
  stdout: string;
}

function command(marker: string, kind: RuntimeCase): Command {
  const lines = Array.from(
    { length: 6 },
    (_, index) => `${marker}_LINE_${index + 1}\n`,
  );

  if (kind === 'cancel')
    return {
      shell: `node -e 'process.stdout.write(${JSON.stringify(marker + '_READY\n')});setTimeout(() => {}, 30000)'`,
      stdout: `${marker}_READY\n`,
    };

  return outputCommand(lines, kind === 'delay' ? 1000 : 0);
}

function outputCommand(lines: string[], delay: number): Command {
  const first = lines.slice(0, 3).join('');
  const last = lines.slice(3).join('');
  const program = `process.stdout.write(${JSON.stringify(first)});setTimeout(() => process.stdout.write(${JSON.stringify(last)}), ${delay})`;

  return { shell: `node -e '${program}'`, stdout: first + last };
}

function commandWorkload(
  base: RuntimeWorkload,
  marker: string,
  kind: RuntimeCase,
): RuntimeWorkload {
  const work = command(marker, kind);
  const end = `${marker}_END`;

  return {
    ...base,
    toolMarker: marker,
    expectedStdout: work.stdout,
    prompt: `Runtime timing trial ${base.id}. Run exactly one command in the foreground: ${work.shell}. Do not edit files or start background work. After it finishes, reply exactly ${end}.`,
    ...completion(kind, work.stdout, end),
  };
}

function completion(
  kind: RuntimeCase,
  stdout: string,
  end: string,
): Pick<RuntimeWorkload, 'cancelAfterStdout' | 'expectedReply'> {
  return kind === 'cancel'
    ? { cancelAfterStdout: stdout }
    : { expectedReply: end };
}

export function runtimeWorkload(
  kind: RuntimeCase,
  options: RuntimeOptions,
): RuntimeWorkload {
  const id = randomUUID();
  const marker = `ARGO_RUNTIME_${id.replaceAll('-', '')}`;

  const base = {
    id,
    prompt: '',
    timeoutMs: options.timeoutMs,
    reopen: options.reopen,
  };

  if (kind === 'sentinel') return sentinel(base, marker);

  return commandWorkload(base, marker, kind);
}

function sentinel(base: RuntimeWorkload, marker: string): RuntimeWorkload {
  return {
    ...base,
    prompt: `Reply exactly ${marker}_END. Do not use tools or edit files.`,
    expectedReply: `${marker}_END`,
  };
}
