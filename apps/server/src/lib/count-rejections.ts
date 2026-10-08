interface RejectionCounter {
  report(detail: string, error?: unknown): void;
  count(): number;
}

export function createRejectionCounter(label: string): RejectionCounter {
  let rejectedValues = 0;
  return {
    report: (detail: string, error?: unknown): void => {
      rejectedValues = countRejection(rejectedValues);
      const line = `${label}: ${detail} #${rejectedValues}`;
      if (error === undefined) console.error(line);
      else console.error(line, error);
    },
    count: (): number => rejectedValues,
  };
}

export function countRejection(previousCount: number): number {
  return previousCount + 1;
}
