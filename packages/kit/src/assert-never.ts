// The default of an exhaustive switch: the compiler rejects it while a case is missing.
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
