export function requestPhoneSpeakerRoute(
  apply: (signal: AbortSignal) => void,
): () => void {
  const request = new AbortController();
  const pending = setTimeout(() => apply(request.signal), 0);

  return () => {
    clearTimeout(pending);
    request.abort();
  };
}
