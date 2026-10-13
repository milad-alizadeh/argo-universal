import type { LaunchLoginTerminal } from '../src/agents';
export const createLoginTerminalMock = (): {
  launchLoginTerminal: LaunchLoginTerminal;
  exited: PromiseWithResolvers<{ exitCode: number }>;
  emit: (text: string) => void;
  writes: string[];
  sizes: [number, number][];
  closed: Promise<void>;
} => {
  const exited = Promise.withResolvers<{ exitCode: number }>();
  const closed = Promise.withResolvers<void>();
  let output: (text: string) => void = ignoreOutput;
  const writes: string[] = [];
  const sizes: [number, number][] = [];
  return {
    exited,
    writes,
    sizes,
    closed: closed.promise,
    emit: (text) => output(text),
    launchLoginTerminal: async (_, received) => {
      output = received;
      return {
        exited: exited.promise,
        write: (text) => writes.push(text),
        resize: (cols, rows) => sizes.push([cols, rows]),
        close: async () => {
          exited.resolve({ exitCode: 1 });
          closed.resolve();
        },
      };
    },
  };
};

const ignoreOutput = (): void => {};
