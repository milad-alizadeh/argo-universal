import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { z } from 'zod';

const LineMessage = z.record(z.string(), z.unknown());
export type LineMessage = z.infer<typeof LineMessage>;

// A child process that speaks one JSON message per line, driven by a test.
export function startLineProcess(executable: string, args: string[]) {
  const child = spawn(executable, args, { stdio: 'pipe' });
  const output: LineMessage[] = [];
  const listeners = new Set<() => void>();
  let readCount = 0;
  let closed = false;
  let stderrText = '';
  const notify = () => {
    for (const listener of listeners) listener();
  };

  child.stdin.on('error', () => {});
  child.stderr.on('data', (chunk) => {
    stderrText += chunk;
  });
  createInterface({ input: child.stdout }).on('line', (line) => {
    output.push(LineMessage.parse(JSON.parse(line)));
    notify();
  });
  // `close` waits for stdout to drain, so `output` is complete once it resolves.
  const exited = new Promise<number | null>((resolve) =>
    child.on('close', (code) => {
      closed = true;
      notify();
      resolve(code);
    }),
  );

  const waitFor = <Value>(take: () => Value | undefined) =>
    new Promise<Value>((resolve, reject) => {
      const check = () => {
        const value = take();
        if (value !== undefined) {
          listeners.delete(check);
          resolve(value);
        } else if (closed) {
          listeners.delete(check);
          reject(new Error(`The process closed early. ${stderrText}`));
        }
      };
      listeners.add(check);
      check();
    });

  return {
    output,
    exited,
    send: (message: unknown) =>
      child.stdin.write(`${JSON.stringify(message)}\n`),
    close: () => child.stdin.end(),
    // The next message not read yet.
    next: () =>
      waitFor(() =>
        readCount < output.length ? output[readCount++] : undefined,
      ),
    // The unread messages up to and including the first that matches.
    until: (matches: (message: LineMessage) => boolean) =>
      waitFor(() => {
        const end = output.findIndex(
          (message, index) => index >= readCount && matches(message),
        );
        if (end === -1) return undefined;
        const messages = output.slice(readCount, end + 1);
        readCount = end + 1;
        return messages;
      }),
  };
}
