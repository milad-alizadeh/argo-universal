interface RejectionCounter {
  // `cause` is why the value was rejected, logged after the line.
  report(detail: string, cause?: unknown): void;
  count(): number;
}

export function createRejectionCounter(label: string): RejectionCounter {
  let rejectedValues = 0;

  return {
    report: (detail: string, cause?: unknown): void => {
      rejectedValues = countRejection(rejectedValues);
      const line = `${label}: ${detail} #${rejectedValues}`;

      if (cause === undefined) console.error(line);
      else console.error(line, cause);
    },
    count: (): number => rejectedValues,
  };
}

export function countRejection(previousCount: number): number {
  return previousCount + 1;
}
