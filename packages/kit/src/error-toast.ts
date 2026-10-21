import type { ErrorToast } from '#primitives/overlays/toast';

// An error's own words: its message, or the value itself.
export const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

// The error toast a failure shows under the title: the failure's words below it; no failure, no toast.
export const errorToast = (
  title: string,
  cause: unknown,
  key?: string,
): ErrorToast | undefined => {
  if (!cause) return undefined;
  const toast: ErrorToast = { title, message: errorMessage(cause) };

  return key === undefined ? toast : { ...toast, key };
};
