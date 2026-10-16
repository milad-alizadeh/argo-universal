import type { BinaryTarget } from '@repo/contracts';

export const binarySource = (target: BinaryTarget): string =>
  target.archive +
  (target.sha256 ? `\0sha256:${target.sha256.toLowerCase()}` : '');

const operations = new Map<string, Promise<void>>();

const settled = (): void => {};

export const serializeBinary = async <Result>(
  base: string,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const result = (operations.get(base) ?? Promise.resolve()).then(operation);
  const tail = result.then(settled, settled);
  operations.set(base, tail);

  try {
    return await result;
  } finally {
    if (operations.get(base) === tail) operations.delete(base);
  }
};
