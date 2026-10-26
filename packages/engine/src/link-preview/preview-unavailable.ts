// A page that cannot give a preview, as the web does: unreachable, refused, not OK, too big or not a page we recognise. It is expected, so it is no report.
export class PreviewUnavailable extends Error {}

export function unavailable(cause: unknown): PreviewUnavailable {
  if (cause instanceof PreviewUnavailable) return cause;

  return new PreviewUnavailable(
    cause instanceof Error ? cause.message : 'Preview unavailable',
    { cause },
  );
}
