export type FieldErrors = readonly unknown[];

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const objectMessage = (error: unknown): string | undefined =>
  error instanceof Object && 'message' in error
    ? textOf(error.message)
    : undefined;

// Standard Schema issues and plain strings both carry the message the person reads.
export const errorMessage = (errors: FieldErrors): string | undefined => {
  const [error] = errors;
  return typeof error === 'string' ? error : objectMessage(error);
};
