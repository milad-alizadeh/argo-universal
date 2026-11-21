export function requestPhoneSpeakerRoute(apply: () => void): () => void {
  const pending = setTimeout(apply, 0);

  return (): void => clearTimeout(pending);
}
