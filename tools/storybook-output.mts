import type { ChildProcess } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';

function pipeOutput(
  stream: Readable | null,
  destination: Writable,
  onOutput: (output: string) => void,
): void {
  if (!stream) return;

  let pending = '';

  stream.setEncoding('utf8');
  stream.on('data', (output: string) => {
    destination.write(output);
    pending = forwardLines(pending + output, onOutput);
  });
}

function forwardLines(
  output: string,
  onOutput: (output: string) => void,
): string {
  const lines = output.split(/[\r\n]+/);
  const pending = lines.pop() ?? '';

  for (const line of lines) onOutput(line);

  return pending;
}

export function forwardOutput(
  child: ChildProcess,
  onOutput: (output: string) => void,
): void {
  pipeOutput(child.stdout, process.stdout, onOutput);
  pipeOutput(child.stderr, process.stderr, onOutput);
}
