// A field's validation error: a plain message, or a Standard Schema issue carrying one.
type FieldError = string | { readonly message: string } | undefined;

export type FieldErrors = readonly FieldError[];

// Standard Schema issues and plain strings both carry the message the person reads.
export const errorMessage = (errors: FieldErrors): string | undefined => {
  const [error] = errors;

  return typeof error === 'string' ? error : error?.message;
};
