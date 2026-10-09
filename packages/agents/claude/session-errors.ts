import { describeError } from '../src/describe-error';
const STDERR_TAIL_LENGTH = 2000;
export function createSessionErrors(): {
  stderr: (text: string) => void;
  describe: (error: unknown) => string;
} {
  let stderrTail = '';
  return {
    stderr: (text): void => {
      stderrTail = `${stderrTail}${text}`.slice(-STDERR_TAIL_LENGTH);
    },
    describe: (error): string => {
      const tail = stderrTail.trim();
      return tail ? `${describeError(error)}\n${tail}` : describeError(error);
    },
  };
}
export type SessionErrors = ReturnType<typeof createSessionErrors>;
