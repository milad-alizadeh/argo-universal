import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { z } from 'zod';

const LineMessage = z.record(z.string(), z.unknown());
export type LineMessage = z.infer<typeof LineMessage>;

export interface LineProcess {
  output: LineMessage[];
  exited: Promise<number | null>;
  send(message: LineMessage[string]): boolean;
  close(): import('node:stream').Writable;
  next(): Promise<LineMessage>;
  until(matches: (message: LineMessage) => boolean): Promise<LineMessage[]>;
}

// A child process that speaks one JSON message per line, driven by a test.
export function startLineProcess(
  executable: string,
  args: string[],
): LineProcess {
  const child = spawn(executable, args, { stdio: 'pipe' });
  const output: LineMessage[] = [];
  const listeners = new Set<() => void>();
  let readCount = 0;
  let closed = false;
  let stderrText = '';
  let failure: Error | null = null;
  const fail = (error: Error): void => {
    failure ??= error;
    notify();
  };
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  child.on('error', fail);
  child.stdin.on('error', (): void => {});
  child.stderr.on('data', (chunk): void => {
    stderrText += chunk;
  });
  createInterface({ input: child.stdout }).on('line', (line): void => {
    try {
      output.push(LineMessage.parse(JSON.parse(line)));
      notify();
    } catch (error) {
      fail(new Error(`Unreadable line: ${line}`, { cause: error }));
    }
  });
  // `close` waits for stdout to drain, so `output` is complete once it resolves.
  const exited = new Promise<number | null>(
    (resolve): import('child_process').ChildProcessWithoutNullStreams =>
      child.on('close', (code): void => {
        closed = true;
        notify();
        resolve(code);
      }),
  );

  const waitFor = <Value>(take: () => Value | undefined): Promise<Value> =>
    new Promise<Value>((resolve, reject): void => {
      const check = (): void => {
        const value = take();
        if (failure !== null) {
          listeners.delete(check);
          reject(failure);
        } else if (value !== undefined) {
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
    send: (message: unknown): boolean =>
      child.stdin.write(`${JSON.stringify(message)}\n`),
    close: (): import('stream').Writable => child.stdin.end(),
    // The next message not read yet.
    next: (): Promise<LineMessage> =>
      waitFor((): LineMessage | undefined =>
        readCount < output.length ? output[readCount++] : undefined,
      ),
    // The unread messages up to and including the first that matches.
    until: (
      matches: (message: LineMessage) => boolean,
    ): Promise<LineMessage[]> =>
      waitFor((): LineMessage[] | undefined => {
        const end = output.findIndex(
          (message, index): boolean => index >= readCount && matches(message),
        );
        if (end === -1) return;
        const messages = output.slice(readCount, end + 1);
        readCount = end + 1;
        return messages;
      }),
  };
}
